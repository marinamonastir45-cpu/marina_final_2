import {
  channelConnections,
  channelLabels,
  hotelSettings,
  invoices,
  payments,
  reservations,
  rooms,
  type ChannelConnection,
  type Guest,
  type HotelSettings,
  type Invoice,
  type Payment,
  type Reservation,
  type Room,
} from "@/data/hotel";
import { getDefaultRooms } from "@/data/hotel";
import { isSupabaseConfigured } from "./isSupabaseConfigured";
import type { Tables } from "./types";

type HotelSettingsRow = Tables<"hotel_settings">;
type RoomTypeRow = Tables<"room_types">;
type RoomImageRow = Tables<"room_images">;
type RoomAmenityRow = Tables<"room_amenities">;
type RoomUnitRow = Tables<"room_units">;
type GuestRow = Tables<"guests">;
type ReservationRow = Tables<"reservations">;
type PaymentRow = Tables<"payments">;
type InvoiceRow = Tables<"invoices">;
type ChannelConnectionRow = Tables<"channel_connections">;

let hotelDataLoadPromise: Promise<boolean> | null = null;

export function loadHotelDataFromSupabase() {
  if (!isSupabaseConfigured()) return Promise.resolve(false);

  hotelDataLoadPromise ??= loadHotelDataFromSupabaseOnce();
  return hotelDataLoadPromise;
}

async function loadHotelDataFromSupabaseOnce() {
  try {
    const { supabase } = await import("./client");

    const [
      settingsResult,
      roomTypesResult,
      roomImagesResult,
      roomAmenitiesResult,
      roomUnitsResult,
      guestsResult,
      reservationsResult,
      paymentsResult,
      invoicesResult,
      channelConnectionsResult,
    ] = await Promise.all([
      supabase.from("hotel_settings").select("*").limit(1).maybeSingle(),
      supabase.from("room_types").select("*").order("name"),
      supabase.from("room_images").select("*").order("sort_order"),
      supabase.from("room_amenities").select("*").order("amenity"),
      supabase.from("room_units").select("*"),
      supabase.from("guests").select("*"),
      supabase.from("reservations").select("*").order("check_in", { ascending: false }),
      supabase.from("payments").select("*").order("updated_at", { ascending: false }),
      supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
      supabase.from("channel_connections").select("*").order("channel"),
    ]);

    const failed = [
      settingsResult,
      roomTypesResult,
      roomImagesResult,
      roomAmenitiesResult,
      roomUnitsResult,
      guestsResult,
      reservationsResult,
      paymentsResult,
      invoicesResult,
    ].find((result) => result.error);

    if (failed?.error) throw failed.error;
    if (channelConnectionsResult.error) {
      console.warn("Supabase channel connection query failed; channel UI will use fallback data.", channelConnectionsResult.error);
    }
    if (!roomTypesResult.data?.length) return false;

    hydrateHotelData({
      settings: settingsResult.data,
      roomTypes: roomTypesResult.data,
      roomImages: roomImagesResult.data ?? [],
      roomAmenities: roomAmenitiesResult.data ?? [],
      roomUnits: roomUnitsResult.data ?? [],
      guests: guestsResult.data ?? [],
      reservations: reservationsResult.data ?? [],
      payments: paymentsResult.data ?? [],
      invoices: invoicesResult.data ?? [],
      channelConnections: channelConnectionsResult.error ? [] : (channelConnectionsResult.data ?? []),
    });

    return true;
  } catch (error) {
    console.warn("Supabase hotel data unavailable; using local mock data.", error);
    return false;
  }
}

function hydrateHotelData({
  settings,
  roomTypes,
  roomImages,
  roomAmenities,
  roomUnits,
  guests,
  reservations: reservationRows,
  payments: paymentRows,
  invoices: invoiceRows,
  channelConnections: channelConnectionRows,
}: {
  settings: HotelSettingsRow | null;
  roomTypes: RoomTypeRow[];
  roomImages: RoomImageRow[];
  roomAmenities: RoomAmenityRow[];
  roomUnits: RoomUnitRow[];
  guests: GuestRow[];
  reservations: ReservationRow[];
  payments: PaymentRow[];
  invoices: InvoiceRow[];
  channelConnections: ChannelConnectionRow[];
}) {
  if (settings) Object.assign(hotelSettings, mapHotelSettings(settings));

  const fallbackImages = rooms.map((room) => room.images);
  const imagesByRoom = groupRoomImages(roomImages);
  const amenitiesByRoom = groupRoomAmenities(roomAmenities);
  const unitsByRoom = groupRoomUnits(roomUnits);
  const mappedRooms = roomTypes.map((room, index) =>
    mapRoomType(
      room,
      imagesByRoom.get(room.id) ?? fallbackImages[index] ?? [],
      amenitiesByRoom,
      unitsByRoom,
    ),
  );
  replaceArray(rooms, mergeWithDefaultRooms(mappedRooms));

  const guestsById = new Map(guests.map((guest) => [guest.id, mapGuest(guest)]));
  replaceArray(
    reservations,
    reservationRows.map((reservation) => mapReservation(reservation, guestsById)),
  );

  replaceArray(payments, paymentRows.map(mapPayment));
  replaceArray(invoices, invoiceRows.map(mapInvoice));

  if (channelConnectionRows.length) {
    replaceArray(channelConnections, channelConnectionRows.map(mapChannelConnection));
  }
}

function resolveLogoUrl(rawLogoUrl: string | null): string {
  if (!rawLogoUrl || rawLogoUrl.endsWith("/assets/marina-logo.png") || rawLogoUrl === "marina-logo.png") {
    return hotelSettings.logoUrl;
  }
  return rawLogoUrl;
}

function resolveHeroUrl(rawHeroUrl: string | null): string {
  if (!rawHeroUrl || rawHeroUrl.endsWith("/assets/hero-marina.jpg") || rawHeroUrl === "hero-marina.jpg") {
    return hotelSettings.heroUrl;
  }
  return rawHeroUrl;
}

function mapHotelSettings(row: HotelSettingsRow): Partial<HotelSettings> {
  return {
    hotelName: row.hotel_name,
    logoUrl: resolveLogoUrl(row.logo_url),
    heroUrl: resolveHeroUrl(row.hero_url),
    phone: row.phone,
    fax: row.fax ?? hotelSettings.fax,
    email: row.email,
    marketingEmail: row.marketing_email ?? hotelSettings.marketingEmail,
    capitainerieEmail: row.capitainerie_email ?? hotelSettings.capitainerieEmail,
    capitaineriePhones: row.capitainerie_phones ?? hotelSettings.capitaineriePhones,
    address: row.address,
    taxRegistration: row.tax_registration,
    invoicePrefix: row.invoice_prefix,
    defaultCurrency: row.default_currency,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    taxRate: Number(row.tax_rate),
    depositPercentage: Number(row.deposit_percentage),
  };
}

function mapRoomType(
  row: RoomTypeRow,
  imageUrls: string[],
  amenitiesByRoom: Map<string, string[]>,
  unitsByRoom: Map<string, RoomUnitRow[]>,
): Room {
  const units = unitsByRoom.get(row.id) ?? [];

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    pricePerNight: Number(row.price_per_night),
    capacityAdults: row.capacity_adults,
    capacityChildren: row.capacity_children,
    beds: row.beds,
    bathrooms: row.bathrooms,
    totalUnits: units.length || row.total_units,
    amenities: amenitiesByRoom.get(row.id) ?? [],
    images: imageUrls.length ? imageUrls : rooms[0]?.images ?? [],
    status: row.status,
    bookings: [],
  };
}

function mapGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    identityNumber: (row as Record<string, unknown>).identity_number as string ?? "",
  };
}

function mapReservation(row: ReservationRow, guestsById: Map<string, Guest>): Reservation {
  const guest = guestsById.get(row.guest_id) ?? {
    id: row.guest_id,
    fullName: "Client",
    email: "",
    phone: "",
    country: "",
    identityNumber: "",
  };

  return {
    id: row.id,
    reservationNumber: row.reservation_number,
    roomId: row.room_type_id,
    guest,
    checkIn: row.check_in,
    checkOut: row.check_out,
    adults: row.adults,
    children: row.children,
    status: row.status,
    paymentStatus: row.payment_status,
    source: row.source,
    specialRequests: row.special_requests ?? undefined,
    createdAt: toDate(row.created_at),
    nights: row.nights,
    roomPrice: Number((row as Record<string, unknown>).price_per_night ?? (row as Record<string, unknown>).room_price ?? 0),
    taxesAndFees: Number((row as Record<string, unknown>).taxes ?? (row as Record<string, unknown>).taxes_and_fees ?? 0),
    deposit: Number(row.deposit),
    total: Number(row.total),
    paidAmount: Number(row.paid_amount ?? 0),
    remainingAmount: Number(row.remaining_amount ?? Math.max(0, Number(row.total) - Number(row.deposit))),
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
    updatedAt: toDate(row.updated_at),
    paidAt: row.paid_at ? toDate(row.paid_at) : undefined,
  };
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    invoiceNumber: row.invoice_number,
    issuedAt: toDate(row.issued_at),
    status: row.status,
    amount: Number((row as Record<string, unknown>).total ?? (row as Record<string, unknown>).amount ?? 0),
  };
}

function mapChannelConnection(row: ChannelConnectionRow): ChannelConnection {
  return {
    id: row.channel,
    name: row.name ?? channelLabels[row.channel] ?? row.channel,
    status: row.status,
    lastSync: row.last_sync ? toDate(row.last_sync) : undefined,
    commissionRate: row.commission_rate ?? undefined,
    importedReservationsCount: row.imported_reservations_count,
    pushedAvailabilityCount: row.pushed_availability_count,
    pushedPricesCount: row.pushed_prices_count,
    errors: row.errors ?? undefined,
    warnings: row.warnings ?? undefined,
  };
}

function groupRoomImages(rows: RoomImageRow[]) {
  const grouped = new Map<string, string[]>();

  for (const image of rows) {
    const current = grouped.get(image.room_type_id) ?? [];
    const url = image.url || image.image_url;
    if (url) current.push(url);
    grouped.set(image.room_type_id, current);
  }

  return grouped;
}

function groupRoomAmenities(rows: RoomAmenityRow[]) {
  const grouped = new Map<string, string[]>();

  for (const amenity of rows) {
    const current = grouped.get(amenity.room_type_id) ?? [];
    current.push(amenity.amenity);
    grouped.set(amenity.room_type_id, current);
  }

  return grouped;
}

function groupRoomUnits(rows: RoomUnitRow[]) {
  const grouped = new Map<string, RoomUnitRow[]>();

  for (const unit of rows) {
    const current = grouped.get(unit.room_type_id) ?? [];
    current.push(unit);
    grouped.set(unit.room_type_id, current);
  }

  return grouped;
}

function replaceArray<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

function mergeWithDefaultRooms(roomTypes: Room[]) {
  if (isSupabaseConfigured()) {
    return roomTypes;
  }

  const bySlugOrId = new Set(roomTypes.flatMap((room) => [room.id, room.slug ?? room.id]));
  const missingDefaults = getDefaultRooms().filter(
    (room) => !bySlugOrId.has(room.id) && !bySlugOrId.has(room.slug ?? room.id),
  );

  return [...roomTypes, ...missingDefaults];
}

function toDate(value: string) {
  return value.slice(0, 10);
}
