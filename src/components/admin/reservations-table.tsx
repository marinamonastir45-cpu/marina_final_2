import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, MessageCircle, MoreHorizontal, Printer, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReservationPrintModal } from "./ReservationPrintModal";
import {
  reservations,
  rooms,
  type ChannelSource,
  type PaymentStatus,
  type ReservationStatus,
} from "@/data/hotel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  getChannelLabels,
  getPaymentStatusLabels,
  getReservationStatusLabels,
} from "@/lib/i18n/labels";
import { localizeRoomName } from "@/lib/i18n/rooms";
import {
  calculatePaidAmount,
  calculateRemainingAmount,
  setPaymentStatus as setPaymentStatusRemote,
} from "@/lib/services/paymentService";
import { generateInvoicePreview } from "@/lib/services/invoiceService";
import { createConversationForAdminReservation } from "@/lib/services/messageService";
import {
  assignRoomUnit,
  setReservationStatus as setReservationStatusRemote,
} from "@/lib/services/reservationService";
import { listRoomUnits, type RoomUnitOption } from "@/lib/services/roomService";
import { StatusBadge } from "./status-badge";

type Props = {
  compact?: boolean;
};

export function ReservationsTable({ compact = false }: Props) {
  const navigate = useNavigate();
  const { t, locale, formatCurrency } = useI18n();
  const reservationStatusLabels = getReservationStatusLabels(locale);
  const paymentStatusLabels = getPaymentStatusLabels(locale);
  const channelLabels = getChannelLabels(locale);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roomId, setRoomId] = useState("all");
  const [status, setStatus] = useState<ReservationStatus | "all">("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [source, setSource] = useState<ChannelSource | "all">("all");
  const [guestSearch, setGuestSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [openingMessageId, setOpeningMessageId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [unitsByRoom, setUnitsByRoom] = useState<Record<string, RoomUnitOption[]>>({});
  const [unitsLoadingRoomId, setUnitsLoadingRoomId] = useState<string | null>(null);
  const [printReservation, setPrintReservation] = useState<(typeof reservations)[number] | null>(null);

  const needle = guestSearch.trim().toLowerCase();
  const rows = reservations
    .filter((reservation) => {
      if (dateFrom && reservation.checkOut < dateFrom) return false;
      if (dateTo && reservation.checkIn > dateTo) return false;
      if (roomId !== "all" && reservation.roomId !== roomId) return false;
      if (status !== "all" && reservation.status !== status) return false;
      if (paymentStatus !== "all" && reservation.paymentStatus !== paymentStatus) return false;
      if (source !== "all" && reservation.source !== source) return false;
      if (
        needle &&
        !`${reservation.reservationNumber} ${reservation.guest.fullName} ${reservation.guest.email} ${reservation.guest.phone} ${reservation.guest.identityNumber}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    })
    .slice(0, compact ? 6 : undefined);

  const setReservation = (reservationId: string, nextStatus: ReservationStatus) => {
    setReservationStatusRemote(reservationId, nextStatus)
      .then(() => {
        setVersion((value) => value + 1);
        toast.success(t("Statut de la réservation mis à jour.", "Booking status updated."));
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : t("Mise à jour du statut impossible.", "Status update failed."),
        );
      });
  };

  const setPayment = (reservationId: string, nextStatus: PaymentStatus) => {
    setPaymentStatusRemote(reservationId, nextStatus)
      .then(() => {
        setVersion((value) => value + 1);
        toast.success(t("Statut de paiement mis à jour.", "Payment status updated."));
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : t("Mise à jour du paiement impossible.", "Payment update failed."),
        );
      });
  };

  const toggleActionMenu = (reservation: (typeof reservations)[number]) => {
    setOpenActionId((current) => (current === reservation.id ? null : reservation.id));
    if (!unitsByRoom[reservation.roomId]) {
      setUnitsLoadingRoomId(reservation.roomId);
      void listRoomUnits(reservation.roomId)
        .then((units) => setUnitsByRoom((current) => ({ ...current, [reservation.roomId]: units })))
        .catch((error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : t("Unités indisponibles.", "Units unavailable."),
          ),
        )
        .finally(() => setUnitsLoadingRoomId(null));
    }
  };

  const assignUnit = async (reservationId: string, roomUnitId: string) => {
    setAssigningId(reservationId);
    try {
      await assignRoomUnit(reservationId, roomUnitId || null);
      toast.success(
        roomUnitId
          ? t("Appartement assigné.", "Apartment assigned.")
          : t("Assignation retirée.", "Assignment removed."),
      );
      setOpenActionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Assignation impossible.", "Assignment failed."),
      );
    } finally {
      setAssigningId(null);
    }
  };

  const createInvoice = async (reservationId: string) => {
    try {
      await generateInvoicePreview(reservationId);
      toast.success(t("Facture générée.", "Invoice generated."));
      setOpenActionId(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("Génération de facture impossible.", "Invoice generation failed."),
      );
    }
  };

  const messageClient = async (reservation: (typeof reservations)[number]) => {
    setOpeningMessageId(reservation.id);
    try {
      const result = await createConversationForAdminReservation(reservation);
      if (!result.linkedClientProfile) {
        toast.info(t("Compte client pas encore lié.", "Guest account not linked yet."));
      }
      setOpenActionId(null);
      navigate({ to: "/admin/messages", search: { conversation: result.conversation.id } });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("Conversation impossible.", "The conversation could not be opened."),
      );
    } finally {
      setOpeningMessageId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {!compact && (
        <div className="grid gap-3 border-b border-border bg-card p-4 md:grid-cols-3 xl:grid-cols-7">
          <label className="relative md:col-span-3 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={guestSearch}
              onChange={(event) => setGuestSearch(event.target.value)}
              placeholder={t(
                "Client, téléphone, email, CIN, réservation...",
                "Guest, phone, email, ID, booking...",
              )}
              className="admin-input pl-9"
            />
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="admin-input"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="admin-input"
          />
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="admin-input"
          >
            <option value="all">{t("Toutes les chambres", "All rooms")}</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {localizeRoomName(room, locale)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ReservationStatus | "all")}
            className="admin-input"
          >
            <option value="all">{t("Tous statuts", "All statuses")}</option>
            {Object.entries(reservationStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "all")}
            className="admin-input"
          >
            <option value="all">{t("Tous paiements", "All payments")}</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as ChannelSource | "all")}
            className="admin-input"
          >
            <option value="all">{t("Toutes sources", "All sources")}</option>
            {Object.entries(channelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/90 text-xs font-black uppercase tracking-wider text-primary">
            <tr>
              <th className="px-5 py-4 min-w-[170px]">{t("Réservation & Statut", "Booking & Status")}</th>
              <th className="px-5 py-4 min-w-[240px]">{t("Client & Contact", "Guest & Contact")}</th>
              <th className="px-5 py-4 min-w-[280px]">{t("Logement & Séjour", "Room & Stay")}</th>
              <th className="px-5 py-4 min-w-[160px]">{t("Règlement & Solde", "Billing & Due")}</th>
              <th className="px-5 py-4 text-right min-w-[110px]">{t("Actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((reservation) => {
              const room = rooms.find((item) => item.id === reservation.roomId);
              const paid = calculatePaidAmount(reservation.id);
              const remaining = calculateRemainingAmount(reservation.id);
              return (
                <tr
                  key={`${reservation.id}-${version}`}
                  className="border-t border-border align-top transition-colors hover:bg-muted/40"
                >
                  <td className="px-5 py-4">
                    <div className="text-base font-extrabold text-primary tracking-tight">
                      {reservation.reservationNumber}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge kind="reservation" value={reservation.status} />
                      {reservation.source !== "direct" && (
                        <StatusBadge kind="source" value={reservation.source} />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-base font-extrabold text-foreground leading-snug">
                      {reservation.guest.fullName}
                    </div>
                    <div className="mt-1 text-sm font-bold text-primary">
                      {reservation.guest.phone || "—"}
                    </div>
                    <div
                      className="mt-0.5 text-[13px] font-semibold text-muted-foreground truncate max-w-[220px]"
                      title={reservation.guest.email}
                    >
                      {reservation.guest.email}
                    </div>
                    {(reservation.guest.country || reservation.guest.identityNumber) && (
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {[reservation.guest.country, reservation.guest.identityNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-base font-extrabold text-foreground leading-snug">
                      {room ? localizeRoomName(room, locale) : reservation.roomId}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                      {reservation.checkIn} {t("au", "to")} {reservation.checkOut}
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {reservation.nights}{" "}
                      {reservation.nights > 1 ? t("nuits", "nights") : t("nuit", "night")} ·{" "}
                      {reservation.adults} {t("ad.", "ad.")}
                      {reservation.children > 0
                        ? ` · ${reservation.children} ${t("enf.", "ch.")}`
                        : ""}
                    </div>
                    {reservation.specialRequests && (
                      <div
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-xs"
                        title={reservation.specialRequests}
                      >
                        <span className="text-sm">💬</span>
                        <span className="font-extrabold">{reservation.specialRequests}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-base font-black text-foreground">
                      {formatCurrency(reservation.total)}
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge kind="payment" value={reservation.paymentStatus} />
                    </div>
                    {remaining > 0 && reservation.paymentStatus !== "paid" && (
                      <div className="mt-1.5 inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-900 shadow-xs">
                        {t("Reste :", "Due :")} {formatCurrency(remaining)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => toggleActionMenu(reservation)}
                        className="admin-action h-10 px-4 font-bold text-sm shadow-sm"
                        aria-expanded={openActionId === reservation.id}
                      >
                        <MoreHorizontal className="size-4" />
                        {t("Actions", "Actions")}
                      </button>
                      {openActionId === reservation.id && (
                        <div className="absolute right-0 top-10 z-20 grid w-56 gap-1 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-lift)]">
                          <ActionMenuButton
                            label={t("Annuler", "Cancel")}
                            danger
                            onClick={() => setReservation(reservation.id, "cancelled")}
                          />
                          <ActionMenuButton
                            label={t("Imprimer fiche / Voucher", "Print voucher")}
                            icon={<Printer className="size-3.5 text-primary" />}
                            onClick={() => {
                              setOpenActionId(null);
                              setPrintReservation(reservation);
                            }}
                          />
                          <ActionMenuButton
                            label={
                              openingMessageId === reservation.id
                                ? t("Ouverture...", "Opening...")
                                : t("Message client", "Message guest")
                            }
                            icon={<MessageCircle className="size-3.5" />}
                            onClick={() => void messageClient(reservation)}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <div className="empty-state mx-auto max-w-xl py-10">
                    <Search className="mx-auto mb-3 size-8 text-accent" />
                    <div className="text-lg font-black text-primary">
                      {t("Aucune réservation", "No bookings")}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t(
                        "Aucune réservation ne correspond aux filtres sélectionnés.",
                        "No bookings match the selected filters.",
                      )}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ReservationPrintModal
        reservation={printReservation}
        open={Boolean(printReservation)}
        onClose={() => setPrintReservation(null)}
      />
    </div>
  );
}

function ActionMenuButton({
  label,
  icon,
  danger = false,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-action justify-start ${
        danger ? "text-destructive hover:border-destructive/40 hover:bg-destructive/10" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
