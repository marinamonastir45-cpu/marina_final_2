import { Banknote, Save } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentMethod, Reservation } from "@/data/hotel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getPaymentMethodLabels } from "@/lib/i18n/labels";
import {
  calculatePaidAmount,
  calculateRemainingAmount,
  defaultPaymentMethod,
  describeError,
  getReservationPayments,
  PAYMENT_METHODS,
  recordPayment,
  roundMoney,
  type PaymentChangeResult,
} from "@/lib/services/paymentService";

const today = () => new Date().toISOString().slice(0, 10);

function parseAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

type Props = {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (result: PaymentChangeResult, amount: number) => void;
};

/** "Encaisser" window: records an amount received for one booking. Mount it with a key per booking. */
export function PaymentCollectDialog({ reservation, open, onOpenChange, onSaved }: Props) {
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const methodLabels = getPaymentMethodLabels(locale);
  const paid = calculatePaidAmount(reservation.id);
  const due = calculateRemainingAmount(reservation.id);
  const history = getReservationPayments(reservation.id).filter((payment) => payment.amount > 0);
  const depositSuggestion =
    paid <= 0 && reservation.deposit > 0 && reservation.deposit < due ? reservation.deposit : null;

  const [amount, setAmount] = useState(() => String(roundMoney(due)));
  const [method, setMethod] = useState<PaymentMethod>(() =>
    defaultPaymentMethod(reservation.source),
  );
  const [paidAt, setPaidAt] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amountValue = parseAmount(amount);
  const amountError =
    amount.trim() === ""
      ? t("Indiquez le montant reçu.", "Enter the amount received.")
      : !Number.isFinite(amountValue) || amountValue <= 0
        ? t("Le montant doit être supérieur à 0.", "The amount must be more than 0.")
        : amountValue > due + 0.0005
          ? t(
              `Le montant dépasse le reste à payer (${formatCurrency(due)}).`,
              `The amount is more than the balance due (${formatCurrency(due)}).`,
            )
          : "";
  const canSave = !amountError && Boolean(paidAt) && !saving;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const result = await recordPayment({
        reservationId: reservation.id,
        amount: amountValue,
        method,
        paidAt,
      });
      onSaved(result, roundMoney(amountValue));
    } catch (saveError) {
      setError(
        describeError(
          saveError,
          t("Le paiement n'a pas pu être enregistré.", "The payment could not be saved."),
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Encaisser un paiement", "Record a payment")}</DialogTitle>
          <DialogDescription>
            {reservation.reservationNumber} · {reservation.guest.fullName} ·{" "}
            {formatDate(reservation.checkIn, { day: "2-digit", month: "short" })} →{" "}
            {formatDate(reservation.checkOut, { day: "2-digit", month: "short", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Amount label={t("Total", "Total")} value={formatCurrency(reservation.total)} />
          <Amount label={t("Déjà payé", "Paid")} value={formatCurrency(paid)} />
          <Amount label={t("Reste", "Balance due")} value={formatCurrency(due)} highlight />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="payment-amount" className="mb-1.5 block text-sm font-semibold">
              {t("Montant reçu (TND)", "Amount received (TND)")}
            </label>
            <input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(amountError)}
              className="admin-input"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="admin-action"
                onClick={() => setAmount(String(roundMoney(due)))}
              >
                {t("Payer le reste", "Pay the balance")} · {formatCurrency(due)}
              </button>
              {depositSuggestion !== null && (
                <button
                  type="button"
                  className="admin-action"
                  onClick={() => setAmount(String(roundMoney(depositSuggestion)))}
                >
                  {t("Acompte", "Deposit")} · {formatCurrency(depositSuggestion)}
                </button>
              )}
            </div>
            {amountError && amount.trim() !== "" && (
              <p className="mt-1.5 text-xs font-semibold text-destructive">{amountError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="payment-method" className="mb-1.5 block text-sm font-semibold">
                {t("Méthode", "Method")}
              </label>
              <select
                id="payment-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="admin-input"
              >
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {methodLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="payment-date" className="mb-1.5 block text-sm font-semibold">
                {t("Date du paiement", "Payment date")}
              </label>
              <input
                id="payment-date"
                type="date"
                max={today()}
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          {history.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                {t("Paiements déjà reçus", "Payments already received")}
              </p>
              <ul className="space-y-1.5 text-sm">
                {history.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {formatDate(payment.paidAt ?? payment.updatedAt)} ·{" "}
                      {methodLabels[payment.method] ?? payment.method}
                    </span>
                    <span className="flex items-center gap-2 font-semibold">
                      {formatCurrency(payment.amount)}
                      <StatusBadge kind="payment" value={payment.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("Annuler", "Cancel")}
            </AdminButton>
            <AdminButton type="submit" disabled={!canSave}>
              {saving ? <Banknote className="animate-pulse" /> : <Save />}
              {saving
                ? t("Enregistrement...", "Saving...")
                : t("Enregistrer le paiement", "Save payment")}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Amount({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border border-amber-300 bg-amber-50 px-2 py-2.5"
          : "rounded-lg border border-border bg-card px-2 py-2.5"
      }
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className={highlight ? "font-black text-amber-900" : "font-black text-primary"}>
        {value}
      </div>
    </div>
  );
}
