import {
  generateInvoiceNumber,
  invoices,
  reservations,
  type Invoice,
  type PaymentStatus,
  type Reservation,
} from "@/data/hotel";
import { mapInvoiceFromDb } from "@/lib/supabase/mappers";
import {
  getSupabaseOrNull,
  replaceArray,
  warnSupabaseFallback,
} from "@/lib/supabase/serviceHelpers";
import { getReservation } from "./reservationService";
import { tr } from "@/lib/i18n/locale";

export async function listInvoices() {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return invoices;

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("issued_at", { ascending: false });

    if (error) throw error;

    replaceArray(invoices, (data ?? []).map(mapInvoiceFromDb));
    return invoices;
  } catch (error) {
    warnSupabaseFallback("invoice query", error);
    return invoices;
  }
}

export async function getInvoiceForReservation(reservationId: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return invoices.find((invoice) => invoice.reservationId === reservationId);

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return invoices.find((invoice) => invoice.reservationId === reservationId);

    const mapped = mapInvoiceFromDb(data);
    upsertInvoiceInMock(mapped);
    return mapped;
  } catch (error) {
    warnSupabaseFallback("reservation invoice lookup", error);
    return invoices.find((invoice) => invoice.reservationId === reservationId);
  }
}

export async function generateInvoicePreview(reservationId: string): Promise<Invoice> {
  const existing = await getInvoiceForReservation(reservationId);
  if (existing) return existing;

  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));

  const reservation = await findReservationForInvoice(reservationId);
  if (!reservation) throw new Error(tr("Réservation introuvable.", "Booking not found."));

  const invoiceNumber = generateInvoiceNumber(invoices.length + 1);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      reservation_id: reservation.id,
      invoice_number: invoiceNumber,
      issued_at: new Date().toISOString().slice(0, 10),
      status: reservation.paymentStatus === "paid" ? "paid" : "draft",
      amount: reservation.total,
    })
    .select("*")
    .single();

  if (error) throw error;

  const mapped = mapInvoiceFromDb(data);

  const itemRows = [
    {
      invoice_id: mapped.id,
      label: "Sejour hotelier",
      quantity: Math.max(1, reservation.nights),
      unit_price:
        reservation.nights > 0
          ? Math.round(reservation.roomPrice / reservation.nights)
          : reservation.roomPrice,
      total: reservation.roomPrice,
    },
    {
      invoice_id: mapped.id,
      label: "Taxes et frais",
      quantity: 1,
      unit_price: reservation.taxesAndFees,
      total: reservation.taxesAndFees,
    },
  ];

  const { error: itemsError } = await supabase.from("invoice_items").insert(itemRows);
  if (itemsError) throw itemsError;

  upsertInvoiceInMock(mapped);
  return mapped;
}

/**
 * Keeps a booking's invoice in line with its payment: once the stay is fully paid the invoice
 * is created (or marked) as paid; if a refund reopens the balance it goes back to "issued".
 */
export async function syncInvoiceWithPaymentStatus(
  reservation: Reservation,
  paymentStatus: PaymentStatus,
): Promise<Invoice | undefined> {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return undefined;

  const existing = await getInvoiceForReservation(reservation.id);
  if (paymentStatus === "paid") {
    if (existing?.status === "paid") return existing;
    if (existing) return updateInvoiceStatus(supabase, existing, "paid");
    return createPaidInvoice(supabase, reservation);
  }
  if (existing?.status === "paid") return updateInvoiceStatus(supabase, existing, "issued");
  return existing;
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseOrNull>>>;

async function updateInvoiceStatus(
  supabase: SupabaseClient,
  invoice: Invoice,
  status: Invoice["status"],
) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoice.id)
    .select("*")
    .single();

  if (error) throw error;
  const mapped = mapInvoiceFromDb(data);
  upsertInvoiceInMock(mapped);
  return mapped;
}

async function createPaidInvoice(supabase: SupabaseClient, reservation: Reservation) {
  // Number from the full list so it follows the last invoice; retry if another one took it.
  await listInvoices();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        reservation_id: reservation.id,
        invoice_number: generateInvoiceNumber(invoices.length + 1 + attempt),
        issued_at: new Date().toISOString().slice(0, 10),
        status: "paid",
        amount: reservation.total,
      })
      .select("*")
      .single();

    if (!error) {
      const mapped = mapInvoiceFromDb(data);
      upsertInvoiceInMock(mapped);
      return mapped;
    }
    if (error.code !== "23505") throw error; // anything but "number already used"
  }
  throw new Error(tr("Aucun numéro de facture disponible.", "No invoice number available."));
}

async function findReservationForInvoice(reservationId: string) {
  const local = reservations.find((reservation) => reservation.id === reservationId);
  if (local) return local;

  const supabase = await getSupabaseOrNull();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("reservations")
    .select("reservation_number")
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !data) return undefined;
  return getReservation(data.reservation_number);
}

function upsertInvoiceInMock(invoice: Invoice) {
  const index = invoices.findIndex((item) => item.id === invoice.id);
  if (index >= 0) invoices[index] = invoice;
  else invoices.unshift(invoice);
}
