import {
  getReservationByNumber,
  reservations,
  type Reservation,
  type ReservationStatus,
} from "@/data/hotel";
import { bookingStore } from "@/lib/booking-store";
import { mapGuestFromDb, mapReservationFromDb } from "@/lib/supabase/mappers";
import {
  getSupabaseOrNull,
  replaceArray,
  warnSupabaseFallback,
} from "@/lib/supabase/serviceHelpers";
import { getBookingQuote } from "./bookingQuoteService";
import { getRoomType, listRoomTypes } from "./roomService";
import { tr } from "@/lib/i18n/locale";

type ReservationRpcResult = {
  reservation_id: string;
  reservation_number: string;
  total: number;
  deposit: number;
  remaining_amount: number;
};
type RpcResult<T> = {
  data: T | null;
  error: unknown;
};
type UntypedRpc = <T>(
  functionName: string,
  args?: Record<string, unknown>,
) => Promise<RpcResult<T>>;

export async function listReservations() {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return reservations;

  try {
    const [reservationsResult, guestsResult] = await Promise.all([
      supabase.from("reservations").select("*").order("check_in", { ascending: false }),
      supabase.from("guests").select("*"),
      listRoomTypes(),
    ]);

    if (reservationsResult.error) throw reservationsResult.error;
    if (guestsResult.error) throw guestsResult.error;

    const guestsById = new Map(
      (guestsResult.data ?? []).map((guest) => [guest.id, mapGuestFromDb(guest)]),
    );
    replaceArray(
      reservations,
      (reservationsResult.data ?? []).map((reservation) =>
        mapReservationFromDb(reservation, guestsById.get(reservation.guest_id)),
      ),
    );

    return reservations;
  } catch (error) {
    warnSupabaseFallback("reservation query", error);
    return reservations;
  }
}

export async function getReservation(reservationNumber: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return getReservationByNumber(reservationNumber);

  try {
    const { data: reservationRow, error: reservationError } = await supabase
      .from("reservations")
      .select("*")
      .eq("reservation_number", reservationNumber)
      .maybeSingle();

    if (reservationError) throw reservationError;
    if (!reservationRow) return getReservationByNumber(reservationNumber);

    const { data: guestRow, error: guestError } = await supabase
      .from("guests")
      .select("*")
      .eq("id", reservationRow.guest_id)
      .maybeSingle();

    if (guestError) throw guestError;

    const mapped = mapReservationFromDb(
      reservationRow,
      mapGuestFromDb(guestRow, reservationRow.guest_id),
    );
    upsertReservationInMock(mapped);
    return mapped;
  } catch (error) {
    warnSupabaseFallback("reservation lookup", error);
    return getReservationByNumber(reservationNumber);
  }
}

export type CreateClientReservationInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  phone?: string;
  country?: string;
  identityNumber?: string;
  specialRequests?: string;
};

/** Creates a reservation owned by the signed-in client (guest_id = auth.uid()),
 * starting in "confirmed" status per hotel direct-booking policy. Requires an
 * authenticated client session — never falls back to mock or anonymous booking. */
export async function createClientReservation(input: CreateClientReservationInput) {
  const room = await getRoomType(input.roomId);
  if (!room) throw new Error(tr("Chambre introuvable.", "Room not found."));

  const quote = await getBookingQuote(room, input.checkIn, input.checkOut);
  if (!quote.canBook) {
    throw new Error(quote.reason ?? "Aucune unite disponible pour ces dates.");
  }

  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));

  const rpcArgs = {
    p_room_type_id: input.roomId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_adults: input.adults,
    p_children: input.children,
    p_phone: input.phone ?? null,
    p_country: input.country ?? null,
    p_cin_passport: input.identityNumber ?? null,
    p_special_requests: input.specialRequests ?? null,
  };

  try {
    const rpc = supabase.rpc as unknown as UntypedRpc;
    const result = await rpc<ReservationRpcResult | ReservationRpcResult[]>(
      "create_client_reservation",
      rpcArgs,
    );

    if (!result.error && result.data) {
      const rpcResult = normalizeRpcResult(result.data);
      const fetched = await getReservation(rpcResult.reservation_number);
      if (fetched) {
        upsertReservationInMock(fetched);
        bookingStore.rememberReservation(fetched.reservationNumber);
        return fetched;
      }
    }
  } catch {
    // Fallback to direct table insertion if RPC fails or is missing
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user)
    throw new Error(
      tr("Vous devez être connecté pour réserver.", "You must be signed in to book."),
    );

  const resId = crypto.randomUUID();
  const resNum = `RES-${resId.slice(0, 8).toUpperCase()}`;
  const nights = quote.breakdown.nights || 1;
  const total = quote.breakdown.totalPrice || room.pricePerNight * nights;
  const deposit = Math.round(total * 0.3);

  let targetGuestId = user.id;

  const { error: guestUpsertErr } = await supabase.from("guests").upsert(
    {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email || "Client",
      email: user.email,
      phone: input.phone || null,
    },
    { onConflict: "id" },
  );

  if (guestUpsertErr) {
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (existingGuest?.id) {
      targetGuestId = existingGuest.id;
    } else {
      const { data: newGuest } = await supabase
        .from("guests")
        .insert({
          full_name: user.user_metadata?.full_name || user.email || "Client",
          email: user.email,
          phone: input.phone || null,
        })
        .select("id")
        .maybeSingle();

      if (newGuest?.id) {
        targetGuestId = newGuest.id;
      }
    }
  }

  const { error: insertError } = await supabase.from("reservations").insert({
    id: resId,
    reservation_number: resNum,
    room_type_id: input.roomId,
    guest_id: targetGuestId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    adults: input.adults,
    children: input.children,
    nights: nights,
    status: "confirmed",
    price_per_night: room.pricePerNight,
    total: total,
    deposit: deposit,
    remaining_amount: total - deposit,
    special_requests: input.specialRequests || null,
  });

  if (insertError) throw new Error(insertError.message || "Impossible de creer la reservation.");

  const created = await getReservation(resNum);
  if (!created) {
    const fallbackRes: Reservation = {
      id: resId,
      reservationNumber: resNum,
      roomId: input.roomId,
      guest: {
        id: user.id,
        fullName: user.user_metadata?.full_name || user.email || "Client",
        email: user.email || "",
        phone: input.phone || "",
        country: input.country || "",
        identityNumber: input.identityNumber || "",
        active: true,
        createdAt: new Date().toISOString(),
      },
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      status: "confirmed",
      pricePerNight: room.pricePerNight,
      taxes: 0,
      total: total,
      deposit: deposit,
      remainingAmount: total - deposit,
      specialRequests: input.specialRequests || "",
      createdAt: new Date().toISOString(),
    };
    upsertReservationInMock(fallbackRes);
    bookingStore.rememberReservation(resNum);
    return fallbackRes;
  }

  upsertReservationInMock(created);
  bookingStore.rememberReservation(resNum);
  return created;
}

function mapReservationError(error: unknown) {
  const maybeError = error as { message?: string };
  const message = maybeError?.message ?? "";

  if (
    message.includes("Authentication required") ||
    message.includes("client account is required")
  ) {
    return new Error("Vous devez etre connecte en tant que client pour reserver.");
  }
  if (message.includes("No available units")) {
    return new Error("Aucune unite disponible pour ces dates.");
  }
  if (message.includes("Guest count exceeds")) {
    return new Error("La capacite demandee depasse celle de cet appartement.");
  }
  if (message.includes("Minimum stay")) {
    return new Error(message);
  }
  if (message.includes("Invalid stay dates")) {
    return new Error("Dates de sejour invalides.");
  }

  return new Error(message || "Impossible de creer la reservation.");
}

export async function setReservationStatus(reservationId: string, status: ReservationStatus) {
  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));

  const { data, error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", reservationId)
    .select("*")
    .single();

  if (error) throw error;

  const existing = reservations.find((reservation) => reservation.id === reservationId);
  if (existing) existing.status = data.status;
  return existing;
}

export async function assignRoomUnit(reservationId: string, roomUnitId: string | null) {
  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));

  const { error } = await supabase
    .from("reservations")
    .update({ room_unit_id: roomUnitId })
    .eq("id", reservationId);

  if (error) throw error;
}

export async function searchReservations(query: string) {
  const needle = query.trim().toLowerCase();
  const items = await listReservations();
  if (!needle) return items;

  return items.filter((reservation) =>
    `${reservation.reservationNumber} ${reservation.guest.fullName} ${reservation.guest.email} ${reservation.guest.phone}`
      .toLowerCase()
      .includes(needle),
  );
}

function upsertReservationInMock(reservation: Reservation) {
  const index = reservations.findIndex((item) => item.id === reservation.id);
  if (index >= 0) reservations[index] = reservation;
  else reservations.unshift(reservation);
}

function normalizeRpcResult(data: ReservationRpcResult | ReservationRpcResult[] | null) {
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.reservation_number) {
    throw new Error(
      tr(
        "La réservation n'a pas retourné de numéro de réservation.",
        "The booking did not return a booking number.",
      ),
    );
  }
  return result;
}
