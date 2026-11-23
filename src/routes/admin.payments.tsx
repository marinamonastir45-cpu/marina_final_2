import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, History, RotateCcw, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminLayout } from "@/components/admin/admin-layout";
import { KpiCard } from "@/components/admin/kpi-card";
import { PaymentCollectDialog } from "@/components/admin/PaymentCollectDialog";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  payments,
  reservations,
  rooms,
  type ChannelSource,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type Reservation,
} from "@/data/hotel";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  getChannelLabels,
  getPaymentMethodLabels,
  getPaymentStatusLabels,
} from "@/lib/i18n/labels";
import { localizeRoomName } from "@/lib/i18n/rooms";
import {
  calculatePaidAmount,
  calculateRemainingAmount,
  describeError,
  listPayments,
  PAYMENT_METHODS,
  refundPayment,
  type PaymentChangeResult,
} from "@/lib/services/paymentService";
import { listReservations } from "@/lib/services/reservationService";
import { listRoomTypes } from "@/lib/services/roomService";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [{ title: headT("Paiements - Marina Cap Monastir", "Payments - Marina Cap Monastir") }],
  }),
  loader: async () => {
    await Promise.all([listRoomTypes(), listReservations(), listPayments()]);
    return null;
  },
  component: AdminPayments,
});

// Bookings that no longer expect money are left out of "À encaisser".
const CLOSED_STATUSES = new Set<Reservation["status"]>(["cancelled", "no_show"]);
const HISTORY_STATUSES: PaymentStatus[] = ["paid", "deposit_paid", "refunded"];

function AdminPayments() {
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const paymentStatusLabels = getPaymentStatusLabels(locale);
  const channelLabels = getChannelLabels(locale);
  const methodLabels = getPaymentMethodLabels(locale);

  const [tab, setTab] = useState("collect");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ChannelSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [collectTarget, setCollectTarget] = useState<Reservation | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [, setVersion] = useState(0);

  const findReservation = (id: string) => reservations.find((item) => item.id === id);
  const roomName = (reservation: Reservation) => {
    const room = rooms.find((item) => item.id === reservation.roomId);
    return room ? localizeRoomName(room, locale) : "";
  };
  const shortDate = (value: string) => formatDate(value, { day: "2-digit", month: "short" });

  // ── À encaisser: open bookings with a balance due, soonest arrival first.
  const collectable = reservations
    .filter((reservation) => !CLOSED_STATUSES.has(reservation.status) && reservation.total > 0)
    .map((reservation) => ({
      reservation,
      paid: calculatePaidAmount(reservation.id),
      due: calculateRemainingAmount(reservation.id),
    }))
    .filter((row) => row.due > 0.0005);

  const query = search.trim().toLowerCase();
  const collectRows = collectable
    .filter(({ reservation }) => {
      if (sourceFilter !== "all" && reservation.source !== sourceFilter) return false;
      if (!query) return true;
      return [
        reservation.reservationNumber,
        reservation.guest.fullName,
        reservation.guest.email,
      ].some((value) => (value ?? "").toLowerCase().includes(query));
    })
    .sort((a, b) => a.reservation.checkIn.localeCompare(b.reservation.checkIn));

  // ── Historique: every amount received, most recent first.
  const historyRows = payments
    .filter((payment) => payment.amount > 0)
    .filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (methodFilter !== "all" && payment.method !== methodFilter) return false;
      if (dateFilter && (payment.paidAt ?? payment.updatedAt) !== dateFilter) return false;
      return true;
    })
    .sort((a, b) => (b.paidAt ?? b.updatedAt).localeCompare(a.paidAt ?? a.updatedAt));

  const totalCollected = reservations.reduce(
    (sum, reservation) => sum + calculatePaidAmount(reservation.id),
    0,
  );
  const totalDue = collectable.reduce((sum, row) => sum + row.due, 0);
  const unpaidCount = collectable.filter((row) => row.paid <= 0).length;

  const reload = async () => {
    await Promise.all([listReservations(), listPayments()]);
    setVersion((value) => value + 1);
  };

  const reportInvoiceIssue = (result: PaymentChangeResult) => {
    if (!result.invoiceError) return;
    toast.warning(
      t(
        "Paiement enregistré, mais la facture n'a pas pu être mise à jour.",
        "Payment saved, but the invoice could not be updated.",
      ),
      { description: result.invoiceError },
    );
  };

  const handleCollected = (result: PaymentChangeResult, amount: number) => {
    setCollectTarget(null);
    toast.success(
      t(
        `Paiement de ${formatCurrency(amount)} enregistré.`,
        `Payment of ${formatCurrency(amount)} recorded.`,
      ),
      {
        description:
          result.paymentStatus === "paid"
            ? t(
                "Séjour soldé : la facture est marquée payée.",
                "Stay fully paid: the invoice is marked as paid.",
              )
            : t(
                `Reste à payer : ${formatCurrency(result.remainingAmount)}.`,
                `Balance due: ${formatCurrency(result.remainingAmount)}.`,
              ),
      },
    );
    reportInvoiceIssue(result);
    void reload();
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const result = await refundPayment(refundTarget.id);
      toast.success(
        t(
          `Paiement de ${formatCurrency(refundTarget.amount)} remboursé.`,
          `Payment of ${formatCurrency(refundTarget.amount)} refunded.`,
        ),
      );
      reportInvoiceIssue(result);
      setRefundTarget(null);
      await reload();
    } catch (error) {
      toast.error(describeError(error, t("Le remboursement a échoué.", "The refund failed.")));
    } finally {
      setRefunding(false);
    }
  };

  const refundReservation = refundTarget ? findReservation(refundTarget.reservationId) : undefined;

  return (
    <AdminLayout
      title={t("Paiements", "Payments")}
      description={t(
        "Encaissez les règlements des clients et gardez l'historique de chaque paiement.",
        "Record what guests pay and keep the history of every payment.",
      )}
    >
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("Montant encaissé", "Amount collected")}
          value={formatCurrency(totalCollected)}
          detail={t("Paiements non remboursés", "Non-refunded payments")}
          icon={CreditCard}
          tone="green"
        />
        <KpiCard
          label={t("Restant dû", "Balance due")}
          value={formatCurrency(totalDue)}
          detail={t("Séjours à encaisser", "Stays to collect")}
          icon={Banknote}
          tone="gold"
        />
        <KpiCard
          label={t("Non payés", "Unpaid")}
          value={String(unpaidCount)}
          detail={t("À relancer", "To follow up")}
          icon={RotateCcw}
          tone="red"
        />
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="collect" className="gap-2 px-4 py-2">
            <Wallet className="size-4" />
            {t("À encaisser", "To collect")} ({collectable.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-4 py-2">
            <History className="size-4" />
            {t("Historique", "History")} ({payments.filter((payment) => payment.amount > 0).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collect" className="mt-0">
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_220px]">
              <label className="relative block">
                <span className="sr-only">{t("Rechercher", "Search")}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t(
                    "Client, email ou N° de réservation",
                    "Guest, email or booking no.",
                  )}
                  className="admin-input pl-9"
                />
              </label>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as ChannelSource | "all")}
                className="admin-input"
                aria-label={t("Source", "Source")}
              >
                <option value="all">{t("Toutes sources", "All sources")}</option>
                {Object.entries(channelLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("Réservation", "Booking")}</th>
                    <th className="px-4 py-3">{t("Client", "Guest")}</th>
                    <th className="px-4 py-3">{t("Séjour", "Stay")}</th>
                    <th className="px-4 py-3">{t("Source", "Source")}</th>
                    <th className="px-4 py-3 text-right">{t("Total", "Total")}</th>
                    <th className="px-4 py-3 text-right">{t("Payé", "Paid")}</th>
                    <th className="px-4 py-3 text-right">{t("Reste", "Balance")}</th>
                    <th className="px-4 py-3">{t("Statut", "Status")}</th>
                    <th className="px-4 py-3 text-right">{t("Action", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {collectRows.map(({ reservation, paid, due }) => (
                    <tr key={reservation.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold text-primary">
                        {reservation.reservationNumber}
                      </td>
                      <td className="px-4 py-3">{reservation.guest.fullName}</td>
                      <td className="px-4 py-3">
                        <div>
                          {shortDate(reservation.checkIn)} → {shortDate(reservation.checkOut)}
                        </div>
                        <div className="text-xs text-muted-foreground">{roomName(reservation)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="source" value={reservation.source} />
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(reservation.total)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(paid)}</td>
                      <td className="px-4 py-3 text-right font-black text-amber-900">
                        {formatCurrency(due)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="payment" value={reservation.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AdminButton size="sm" onClick={() => setCollectTarget(reservation)}>
                          <Banknote />
                          {t("Encaisser", "Collect")}
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {collectRows.length === 0 && (
                <p className="p-8 text-center text-sm font-semibold text-muted-foreground">
                  {collectable.length === 0
                    ? t("Tous les séjours sont réglés.", "Every stay is paid.")
                    : t(
                        "Aucune réservation ne correspond à la recherche.",
                        "No booking matches the search.",
                      )}
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "all")}
                className="admin-input"
                aria-label={t("Statut", "Status")}
              >
                <option value="all">{t("Tous les statuts", "All statuses")}</option>
                {HISTORY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {paymentStatusLabels[value]}
                  </option>
                ))}
              </select>
              <select
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value as PaymentMethod | "all")}
                className="admin-input"
                aria-label={t("Méthode", "Method")}
              >
                <option value="all">{t("Toutes méthodes", "All methods")}</option>
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {methodLabels[value]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="admin-input"
                aria-label={t("Date", "Date")}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("Date", "Date")}</th>
                    <th className="px-4 py-3">{t("Réservation", "Booking")}</th>
                    <th className="px-4 py-3">{t("Client", "Guest")}</th>
                    <th className="px-4 py-3 text-right">{t("Montant", "Amount")}</th>
                    <th className="px-4 py-3">{t("Méthode", "Method")}</th>
                    <th className="px-4 py-3">{t("Statut", "Status")}</th>
                    <th className="px-4 py-3 text-right">{t("Action", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((payment) => {
                    const reservation = findReservation(payment.reservationId);
                    return (
                      <tr key={payment.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(payment.paidAt ?? payment.updatedAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {reservation?.reservationNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3">{reservation?.guest.fullName ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {methodLabels[payment.method] ?? payment.method}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="payment" value={payment.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payment.status !== "refunded" && (
                            <button
                              type="button"
                              className="admin-action"
                              onClick={() => setRefundTarget(payment)}
                            >
                              <RotateCcw className="size-3.5" />
                              {t("Rembourser", "Refund")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {historyRows.length === 0 && (
                <p className="p-8 text-center text-sm font-semibold text-muted-foreground">
                  {t("Aucun paiement enregistré.", "No payment recorded.")}
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {t(
          "Les méthodes de paiement sont des statuts de suivi seulement. Aucun numéro de carte ni CVC n'est stocké.",
          "Payment methods are tracking statuses only. No card number or CVC is stored.",
        )}
      </p>

      {collectTarget && (
        <PaymentCollectDialog
          key={collectTarget.id}
          reservation={collectTarget}
          open
          onOpenChange={(open) => !open && setCollectTarget(null)}
          onSaved={handleCollected}
        />
      )}

      <AlertDialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => !open && !refunding && setRefundTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Rembourser ce paiement ?", "Refund this payment?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget &&
                t(
                  `${formatCurrency(refundTarget.amount)} (${methodLabels[refundTarget.method] ?? refundTarget.method}) — ${refundReservation?.reservationNumber ?? ""} ${refundReservation?.guest.fullName ?? ""}. Le reste à payer de la réservation sera recalculé.`,
                  `${formatCurrency(refundTarget.amount)} (${methodLabels[refundTarget.method] ?? refundTarget.method}) — ${refundReservation?.reservationNumber ?? ""} ${refundReservation?.guest.fullName ?? ""}. The booking's balance will be recalculated.`,
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>{t("Annuler", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={refunding}
              onClick={(event) => {
                event.preventDefault();
                void confirmRefund();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {refunding ? t("Remboursement...", "Refunding...") : t("Rembourser", "Refund")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
