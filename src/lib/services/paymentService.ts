import {
  payments,
  reservations,
  type ChannelSource,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type Reservation,
} from "@/data/hotel";
import { mapPaymentFromDb } from "@/lib/supabase/mappers";
import {
  getSupabaseOrNull,
  replaceArray,
  warnSupabaseFallback,
} from "@/lib/supabase/serviceHelpers";
import { syncInvoiceWithPaymentStatus } from "./invoiceService";
import { listReservations } from "./reservationService";
import { tr } from "@/lib/i18n/locale";

export async function listPayments() {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return payments;

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    replaceArray(payments, (data ?? []).map(mapPaymentFromDb));
    return payments;
  } catch (error) {
    warnSupabaseFallback("payment query", error);
    return payments;
  }
}

export async function getPaymentForReservation(reservationId: string) {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return payments.find((payment) => payment.reservationId === reservationId);

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return payments.find((payment) => payment.reservationId === reservationId);

    const mapped = mapPaymentFromDb(data);
    upsertPaymentInMock(mapped);
    return mapped;
  } catch (error) {
    warnSupabaseFallback("reservation payment lookup", error);
    return payments.find((payment) => payment.reservationId === reservationId);
  }
}

export function calculatePaidAmount(reservationId: string) {
  const reservationPayments = payments.filter(
    (payment) => payment.reservationId === reservationId && payment.status !== "refunded",
  );
  if (reservationPayments.length) {
    return reservationPayments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  return reservations.find((item) => item.id === reservationId)?.paidAmount ?? 0;
}

export function calculateRemainingAmount(reservationId: string) {
  const reservation = reservations.find((item) => item.id === reservationId);
  if (!reservation) return 0;
  return Math.max(0, reservation.total - calculatePaidAmount(reservationId));
}

export async function setPaymentStatus(reservationId: string, status: PaymentStatus) {
  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));

  const reservationItems = await listReservations();
  const reservation = reservationItems.find((item) => item.id === reservationId);
  if (!reservation)
    throw new Error(
      tr(`Réservation ${reservationId} introuvable.`, `Booking ${reservationId} not found.`),
    );

  const amount =
    status === "paid" ? reservation.total : status === "deposit_paid" ? reservation.deposit : 0;
  const paidAmount = status === "refunded" ? 0 : amount;
  const remainingAmount = Math.max(0, reservation.total - paidAmount);

  const existingPayment = await getPaymentForReservation(reservationId);
  let mappedPayment: Payment | undefined;

  if (existingPayment) {
    const { data, error } = await supabase
      .from("payments")
      .update({
        amount,
        status,
        method: existingPayment.method,
        paid_at: status === "paid" || status === "deposit_paid" ? new Date().toISOString() : null,
      })
      .eq("id", existingPayment.id)
      .select("*")
      .single();

    if (error) throw error;
    mappedPayment = mapPaymentFromDb(data);
    upsertPaymentInMock(mappedPayment);
  } else if (status !== "unpaid") {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        reservation_id: reservationId,
        amount,
        status,
        method: "online",
        paid_at: status === "paid" || status === "deposit_paid" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (error) throw error;
    mappedPayment = mapPaymentFromDb(data);
    upsertPaymentInMock(mappedPayment);
  }

  const { error: reservationError } = await supabase
    .from("reservations")
    .update({
      payment_status: status,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
    })
    .eq("id", reservationId);

  if (reservationError) throw reservationError;

  reservation.paymentStatus = status;
  reservation.paidAmount = paidAmount;
  reservation.remainingAmount = remainingAmount;
  return mappedPayment;
}

// ── Collecting payments ─────────────────────────────────────────────────────
// Every amount received is its own row in `payments` (a refund flags its row "refunded"), so a
// booking keeps its full history. The booking's payment status, paid and remaining amounts are
// recomputed from those rows after each change.

const MONEY_EPSILON = 0.0005;

export function roundMoney(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** Payment status that follows from what has been collected so far. */
export function derivePaymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= MONEY_EPSILON) return "unpaid";
  if (paid >= total - MONEY_EPSILON) return "paid";
  return "deposit_paid";
}

/** Payments of one booking, most recent first (refunded ones included). */
export function getReservationPayments(reservationId: string) {
  return payments
    .filter((payment) => payment.reservationId === reservationId)
    .sort((a, b) => (b.paidAt ?? b.updatedAt).localeCompare(a.paidAt ?? a.updatedAt));
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "card",
  "bank_transfer",
  "online",
  "booking_com_payout",
  "airbnb_payout",
  "expedia_payout",
];

/** Method suggested for a booking: OTA bookings are paid out by the channel, the rest in cash. */
export function defaultPaymentMethod(source: ChannelSource): PaymentMethod {
  if (source === "booking_com") return "booking_com_payout";
  if (source === "airbnb") return "airbnb_payout";
  if (source === "expedia") return "expedia_payout";
  return "cash";
}

export type RecordPaymentInput = {
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  /** YYYY-MM-DD */
  paidAt: string;
};

export type PaymentChangeResult = {
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  /** Set when the payment was saved but the invoice could not be created or updated. */
  invoiceError?: string;
};

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseOrNull>>>;

export async function recordPayment(input: RecordPaymentInput): Promise<PaymentChangeResult> {
  const supabase = await requireSupabase();
  const reservation = await findReservation(input.reservationId);
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(tr("Montant invalide.", "Invalid amount."));
  }

  const rows = await fetchReservationPaymentRows(supabase, reservation.id);

  // A booking created with a payment already marked (new-booking form) has a paid amount but
  // no payment row: record that amount first so it stays in the totals and the history.
  const openingAmount = roundMoney(reservation.paidAmount ?? 0);
  if (rows.length === 0 && openingAmount > MONEY_EPSILON) {
    rows.push(
      await insertPaymentRow(supabase, {
        reservationId: reservation.id,
        amount: openingAmount,
        method: defaultPaymentMethod(reservation.source),
        paidAt: reservation.createdAt.slice(0, 10),
        status: derivePaymentStatus(reservation.total, openingAmount),
      }),
    );
  }

  const alreadyPaid = sumCollected(rows);
  const remaining = roundMoney(Math.max(0, reservation.total - alreadyPaid));
  if (amount > remaining + MONEY_EPSILON) {
    throw new Error(
      tr(
        `Le montant dépasse le reste à payer (${remaining}).`,
        `The amount is more than the balance due (${remaining}).`,
      ),
    );
  }

  rows.push(
    await insertPaymentRow(supabase, {
      reservationId: reservation.id,
      amount,
      method: input.method,
      paidAt: input.paidAt,
      status: derivePaymentStatus(reservation.total, alreadyPaid + amount),
    }),
  );

  return applyPaymentState(supabase, reservation, rows);
}

export async function refundPayment(paymentId: string): Promise<PaymentChangeResult> {
  const supabase = await requireSupabase();

  const { data: row, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error(tr("Paiement introuvable.", "Payment not found."));
  if (row.status === "refunded") {
    throw new Error(tr("Ce paiement est déjà remboursé.", "This payment is already refunded."));
  }

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select("*")
    .single();
  if (updateError) throw updateError;
  upsertPaymentInMock(mapPaymentFromDb(updated));

  const reservation = await findReservation(row.reservation_id);
  const rows = await fetchReservationPaymentRows(supabase, reservation.id);
  return applyPaymentState(supabase, reservation, rows);
}

async function requireSupabase() {
  const supabase = await getSupabaseOrNull();
  if (!supabase)
    throw new Error(tr("Supabase n'est pas configuré.", "Supabase is not configured."));
  return supabase;
}

async function findReservation(reservationId: string) {
  const reservation = (await listReservations()).find((item) => item.id === reservationId);
  if (!reservation)
    throw new Error(
      tr(`Réservation ${reservationId} introuvable.`, `Booking ${reservationId} not found.`),
    );
  return reservation;
}

async function fetchReservationPaymentRows(supabase: SupabaseClient, reservationId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("reservation_id", reservationId);
  if (error) throw error;

  const rows = (data ?? []).map(mapPaymentFromDb);
  rows.forEach(upsertPaymentInMock);
  return rows;
}

async function insertPaymentRow(
  supabase: SupabaseClient,
  input: RecordPaymentInput & { status: PaymentStatus },
) {
  const today = new Date().toISOString().slice(0, 10);
  // Keep the real time for today's payments; a past day is stored at noon so it stays that day.
  const paidAt =
    input.paidAt === today
      ? new Date().toISOString()
      : new Date(`${input.paidAt}T12:00:00`).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .insert({
      reservation_id: input.reservationId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      paid_at: paidAt,
    })
    .select("*")
    .single();
  if (error) throw error;

  const mapped = mapPaymentFromDb(data);
  upsertPaymentInMock(mapped);
  return mapped;
}

function sumCollected(rows: Payment[]) {
  return roundMoney(
    rows
      .filter((payment) => payment.status !== "refunded")
      .reduce((sum, payment) => sum + payment.amount, 0),
  );
}

async function applyPaymentState(
  supabase: SupabaseClient,
  reservation: Reservation,
  rows: Payment[],
): Promise<PaymentChangeResult> {
  const paidAmount = sumCollected(rows);
  const remainingAmount = roundMoney(Math.max(0, reservation.total - paidAmount));
  const paymentStatus = derivePaymentStatus(reservation.total, paidAmount);

  const { error } = await supabase
    .from("reservations")
    .update({
      payment_status: paymentStatus,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
    })
    .eq("id", reservation.id);
  if (error) throw error;

  reservation.paymentStatus = paymentStatus;
  reservation.paidAmount = paidAmount;
  reservation.remainingAmount = remainingAmount;

  let invoiceError: string | undefined;
  try {
    await syncInvoiceWithPaymentStatus(reservation, paymentStatus);
  } catch (invoiceFailure) {
    invoiceError = describeError(invoiceFailure, tr("Erreur de facture.", "Invoice error."));
  }

  return { paymentStatus, paidAmount, remainingAmount, invoiceError };
}

/** Message of an Error or a Supabase error object (which is not always an Error instance). */
export function describeError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function upsertPaymentInMock(payment: Payment) {
  const index = payments.findIndex((item) => item.id === payment.id);
  if (index >= 0) payments[index] = payment;
  else payments.unshift(payment);
}
