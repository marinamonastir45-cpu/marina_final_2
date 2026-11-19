import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  BedDouble,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  CreditCard,
  Hotel,
  Loader2,
  Percent,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type React from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminNewReservationButton } from "@/components/admin/AdminNewReservationModal";
import { CreateClientAccountButton } from "@/components/admin/CreateClientAccountButton";
import { KpiCard, KpiCardSkeleton } from "@/components/admin/kpi-card";
import { ReservationsTable } from "@/components/admin/reservations-table";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Guest, Invoice, Payment, Reservation, Room } from "@/data/hotel";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  getChannelLabels,
  localizeAlertDescription,
  localizeAlertSeverity,
  localizeAlertTitle,
} from "@/lib/i18n/labels";
import { tr } from "@/lib/i18n/locale";
import { localizeRoomName } from "@/lib/i18n/rooms";
import {
  getAvailableUnitsForDate,
  getTodayCheckIns,
  getTodayCheckOuts,
  getMonthlyRevenueStats,
  getRevenueBySource,
  getTodayIso,
} from "@/lib/services/statisticsService";
import { listAutomationAlerts } from "@/lib/services/alertService";
import { listInvoices } from "@/lib/services/invoiceService";
import { listPayments } from "@/lib/services/paymentService";
import { listReservations, autoUpdateReservationStatuses } from "@/lib/services/reservationService";
import { listRoomTypes } from "@/lib/services/roomService";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { isSupabaseConfigured } from "@/lib/supabase/isSupabaseConfigured";
import { adminButtonClasses } from "@/components/admin/AdminButton";
import { getSupabaseOrNull } from "@/lib/supabase/serviceHelpers";
import type { Tables } from "@/lib/supabase/types";

const LOAD_TIMEOUT_MS = 5000;

// ── Types ──────────────────────────────────────────────────────────────────

type RevenueStats = {
  month: string;
  revenue: number;
  adr: number;
  revpar: number;
  unpaidAmount: number;
};

type RevenueBySource = { source: string; label: string; revenue: number };

type DashboardStats = {
  today: string;
  monthlyStats: RevenueStats;
  revenueBySource: RevenueBySource[];
  availableToday: number;
  arrivals: Reservation[];
  departures: Reservation[];
  currentGuests: Reservation[];
};

type DashboardData = {
  reservations: Reservation[];
  rooms: Room[];
  payments: Payment[];
  invoices: Invoice[];
  guests: Guest[];
  alerts: Awaited<ReturnType<typeof listAutomationAlerts>>;
  stats: DashboardStats;
};

type DashboardErrors = {
  reservations: string | null;
  rooms: string | null;
  payments: string | null;
  invoices: string | null;
  guests: string | null;
  alerts: string | null;
  statistics: string | null;
};

type DashboardLoaderData = {
  isDashboard: boolean;
  data: DashboardData;
  errors: DashboardErrors;
};

type DashboardStatus = "loading" | "success" | "partial" | "error" | "demo";

type SafeResult<T> = {
  data: T;
  error: string | null;
};

type GuestRow = Tables<"guests">;

const emptyDashboardErrors: DashboardErrors = {
  reservations: null,
  rooms: null,
  payments: null,
  invoices: null,
  guests: null,
  alerts: null,
  statistics: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function defaultRevenueStats(today: string): RevenueStats {
  return { month: today.slice(0, 7), revenue: 0, adr: 0, revpar: 0, unpaidAmount: 0 };
}

function defaultStats(today: string): DashboardStats {
  return {
    today,
    monthlyStats: defaultRevenueStats(today),
    revenueBySource: [],
    availableToday: 0,
    arrivals: [],
    departures: [],
    currentGuests: [],
  };
}

function emptyDashboardData(today = getTodayIso()): DashboardData {
  return {
    reservations: [],
    rooms: [],
    payments: [],
    invoices: [],
    guests: [],
    alerts: [],
    stats: defaultStats(today),
  };
}

async function safeDashboardQuery<T>(
  module: keyof DashboardErrors,
  fallback: T,
  query: () => Promise<T | null | undefined>,
): Promise<SafeResult<T>> {
  try {
    const data = await query();
    return { data: data ?? fallback, error: null };
  } catch (error) {
    console.error("[ADMIN DASHBOARD ERROR]", error);
    console.error(`${module} dashboard query failed`, error);
    return { data: fallback, error: getErrorMessage(error) };
  }
}

async function loadDashboardData(locationPathname = "/admin"): Promise<DashboardLoaderData> {
  const today = getTodayIso();
  const isDashboard = locationPathname === "/admin";

  if (!isDashboard) {
    return {
      isDashboard: false,
      data: emptyDashboardData(today),
      errors: { ...emptyDashboardErrors },
    };
  }

  // Auto check-in / check-out basé sur les dates — système automatique
  await autoUpdateReservationStatuses().catch((err) => {
    if (import.meta.env.DEV) console.warn("[autoUpdate] skipped:", err);
  });

  const [rooms, reservations, payments, invoices, guests, alerts, stats] = await Promise.all([
    safeDashboardQuery("rooms", [] as Room[], listRoomTypes),
    safeDashboardQuery("reservations", [] as Reservation[], listReservations),
    safeDashboardQuery("payments", [] as Payment[], listPayments),
    safeDashboardQuery("invoices", [] as Invoice[], listInvoices),
    safeDashboardQuery("guests", [] as Guest[], listDashboardGuests),
    safeDashboardQuery("alerts", [] as Awaited<ReturnType<typeof listAutomationAlerts>>, () =>
      listAutomationAlerts(today),
    ),
    safeDashboardQuery("statistics", defaultStats(today), () => loadDashboardStats(today)),
  ]);

  const data = {
    rooms: asArray(rooms.data),
    reservations: asArray(reservations.data),
    payments: asArray(payments.data),
    invoices: asArray(invoices.data),
    guests: asArray(guests.data),
    alerts: asArray(alerts.data),
    stats: stats.data ?? defaultStats(today),
  };

  const errors = {
    reservations: reservations.error,
    rooms: rooms.error,
    payments: payments.error,
    invoices: invoices.error,
    guests: guests.error,
    alerts: alerts.error,
    statistics: stats.error,
  };

  if (import.meta.env.DEV) {
    console.info("[Admin Dashboard] Loaded.", {
      supabaseConfigured: isSupabaseConfigured(),
      reservations: data.reservations.length,
      rooms: data.rooms.length,
      errors: Object.values(errors).filter(Boolean).length,
    });
  }

  return {
    isDashboard: true,
    data,
    errors,
  };
}

async function loadDashboardStats(today: string): Promise<DashboardStats> {
  const [monthlyStats, revenueBySource, availableToday, arrivals, departures, reservationItems] =
    await Promise.all([
      getMonthlyRevenueStats().catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("monthly statistics dashboard query failed", error);
        return defaultRevenueStats(today);
      }),
      getRevenueBySource().catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("revenue source dashboard query failed", error);
        return [] as RevenueBySource[];
      }),
      getAvailableUnitsForDate(today).catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("availability dashboard query failed", error);
        return 0;
      }),
      getTodayCheckIns(today).catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("arrivals dashboard query failed", error);
        return [] as Reservation[];
      }),
      getTodayCheckOuts(today).catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("departures dashboard query failed", error);
        return [] as Reservation[];
      }),
      listReservations().catch((error) => {
        console.error("[ADMIN DASHBOARD ERROR]", error);
        console.error("current guests dashboard query failed", error);
        return [] as Reservation[];
      }),
    ]);

  const currentGuests = asArray(reservationItems).filter(
    (reservation) =>
      reservation?.status === "checked_in" &&
      safeDateString(reservation.checkIn) <= today &&
      safeDateString(reservation.checkOut) > today,
  );

  return {
    today,
    monthlyStats: monthlyStats ?? defaultRevenueStats(today),
    revenueBySource: asArray(revenueBySource),
    availableToday: safeNumber(availableToday),
    arrivals: asArray(arrivals),
    departures: asArray(departures),
    currentGuests,
  };
}

async function listDashboardGuests(): Promise<Guest[]> {
  const supabase = await getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase.from("guests").select("*");
  if (error) throw error;
  return (data ?? []).map(mapGuestRow);
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function safeDateString(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

function normalizeRevenueStats(
  value: RevenueStats | null | undefined,
  today: string,
): RevenueStats {
  return {
    month: value?.month ?? today.slice(0, 7),
    revenue: safeNumber(value?.revenue),
    adr: safeNumber(value?.adr),
    revpar: safeNumber(value?.revpar),
    unpaidAmount: safeNumber(value?.unpaidAmount),
  };
}

function mapGuestRow(row: GuestRow): Guest {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    identityNumber: row.identity_number,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code].filter(
    Boolean,
  );
  return parts.length ? parts.join(" | ") : tr("Erreur inconnue", "Unknown error");
}

function formatModuleName(module: string) {
  const labels: Record<string, { fr: string; en: string }> = {
    reservations: { fr: "Réservations", en: "Bookings" },
    rooms: { fr: "Chambres", en: "Rooms" },
    payments: { fr: "Paiements", en: "Payments" },
    invoices: { fr: "Factures", en: "Invoices" },
    guests: { fr: "Clients", en: "Guests" },
    alerts: { fr: "Alertes", en: "Alerts" },
    statistics: { fr: "Statistiques", en: "Statistics" },
  };
  const label = labels[module];
  return label ? tr(label.fr, label.en) : module;
}

// ── Route ──────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    await requireAdmin(location.pathname);
  },
  loader: async ({ location }) => loadDashboardData(location.pathname),
  shouldReload: ({ location }) => location.pathname === "/admin",
  head: () => ({
    meta: [
      {
        title: headT(
          "Administration - Marina Cap Monastir",
          "Administration - Marina Cap Monastir",
        ),
      },
      {
        name: "description",
        content: headT(
          "Tableau de bord hôtelier Marina Cap Monastir.",
          "Marina Cap Monastir hotel dashboard.",
        ),
      },
    ],
  }),
  pendingComponent: AdminDashboardPending,
  component: AdminRoute,
});

// ── Layout wrapper ─────────────────────────────────────────────────────────

function AdminRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin") return <Outlet />;
  return <AdminDashboard />;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function AdminDashboardPending() {
  const { t } = useI18n();
  return (
    <AdminLayout
      title={t("Tableau de bord", "Dashboard")}
      description={t("Chargement des données...", "Loading data...")}
    >
      <DashboardLoadingState />
      {import.meta.env.DEV && (
        <DebugPanel
          status="loading"
          supabaseConfigured={isSupabaseConfigured()}
          reservationsCount={0}
          roomsCount={0}
          errorsCount={0}
        />
      )}
    </AdminLayout>
  );
}

function AdminDashboard() {
  const loaderData = Route.useLoaderData() as DashboardLoaderData | undefined;
  const router = useRouter();
  const { t, pick, locale, formatCurrency } = useI18n();
  const channelLabels = getChannelLabels(locale);
  const data = loaderData?.data ?? emptyDashboardData();
  const errors = loaderData?.errors ?? { ...emptyDashboardErrors };
  const failedModules = Object.entries(errors).filter(([, error]) => Boolean(error));
  const status: DashboardStatus = failedModules.length > 0 ? "partial" : "success";
  const stats = data.stats ?? defaultStats(getTodayIso());
  const today = stats.today ?? getTodayIso();
  const roomItems = asArray(data.rooms);
  const reservationItems = asArray(data.reservations);
  const invoiceItems = asArray(data.invoices);
  const alerts = asArray(data.alerts);
  const arrivals = asArray(stats.arrivals);
  const departures = asArray(stats.departures);
  const currentGuests = asArray(stats.currentGuests);
  const monthlyStats = normalizeRevenueStats(stats.monthlyStats, today);
  const revenueBySource = asArray(stats.revenueBySource);
  const availableToday = safeNumber(stats.availableToday);
  const retry = () => void router.invalidate();

  const totalUnits = roomItems.reduce((sum, room) => sum + safeNumber(room?.totalUnits), 0);
  const bookedToday = Math.max(0, totalUnits - availableToday);
  const occupancy = totalUnits > 0 ? Math.round((bookedToday / totalUnits) * 100) : 0;
  const confirmed = reservationItems.filter(
    (reservation) => reservation?.status === "confirmed",
  ).length;
  const pending = reservationItems.filter(
    (reservation) => reservation?.status === "pending",
  ).length;
  const cancellations = reservationItems.filter(
    (reservation) => reservation?.status === "cancelled",
  ).length;
  const pendingPayments = reservationItems.filter(
    (reservation) => reservation?.paymentStatus !== "paid",
  ).length;
  const unpaidInvoices = invoiceItems.filter(
    (invoice) => invoice?.status !== "paid" && invoice?.status !== "void",
  ).length;
  const maxRevenue = Math.max(1, ...revenueBySource.map((item) => safeNumber(item?.revenue)));
  const activeStatuses = new Set(["pending", "confirmed", "checked_in"]);
  const roomsToWatch = roomItems
    .map((room) => {
      const occupied = reservationItems.filter(
        (reservation) =>
          reservation?.roomId === room.id &&
          activeStatuses.has(reservation?.status ?? "") &&
          safeDateString(reservation.checkIn) <= today &&
          safeDateString(reservation.checkOut) > today,
      ).length;
      const total = safeNumber(room.totalUnits);
      const available = Math.max(0, total - occupied);
      const ratio = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return { room, occupied, available, ratio };
    })
    .filter(
      ({ room, available, ratio }) => room.status !== "active" || available <= 2 || ratio >= 70,
    )
    .slice(0, 5);
  const hotelStatus = isSupabaseConfigured()
    ? t("Supabase connecté", "Supabase connected")
    : t("Mock local", "Local mock data");

  return (
    <AdminLayout
      title={t("Tableau de bord", "Dashboard")}
      description={t(
        "Pilotage hôtelier centralisé : arrivées, départs, revenus, alertes et canaux.",
        "Central hotel management: arrivals, departures, revenue, alerts and channels.",
      )}
      actions={
        <>
          <CreateClientAccountButton onCreated={() => router.invalidate()} />
          <Link to="/admin/statistics" className={adminButtonClasses("primary")}>
            {t("Voir statistiques", "View statistics")}
          </Link>
        </>
      }
    >
      {failedModules.length > 0 && (
        <DashboardErrorCard failedModules={failedModules} onRetry={retry} />
      )}

      <DashboardHero
        today={today}
        hotelStatus={hotelStatus}
        occupancy={occupancy}
        pendingPayments={pendingPayments}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label={t("Check-ins aujourd'hui", "Check-ins today")}
          value={String(arrivals.length)}
          detail={today}
          trend={arrivals.length > 0 ? t("À préparer", "To prepare") : t("Calme", "Quiet")}
          icon={CalendarCheck}
          tone="gold"
        />
        <KpiCard
          label={t("Check-outs aujourd'hui", "Check-outs today")}
          value={String(departures.length)}
          detail={t("Départs prévus", "Scheduled departures")}
          trend={departures.length > 0 ? t("À suivre", "To follow") : t("RAS", "All clear")}
          icon={CalendarX}
          tone="turquoise"
        />
        <KpiCard
          label={t("Taux d'occupation", "Occupancy rate")}
          value={`${occupancy}%`}
          detail={`${bookedToday}/${totalUnits} ${t("unités", "units")}`}
          trend={occupancy >= 80 ? t("Fort", "High") : t("Stable", "Stable")}
          icon={Percent}
          tone={occupancy >= 80 ? "green" : "navy"}
        />
        <KpiCard
          label={t("Chambres disponibles", "Rooms available")}
          value={String(availableToday)}
          detail={t("Inventaire du jour", "Today's inventory")}
          trend={availableToday <= 2 ? t("Faible", "Low") : t("Disponible", "Available")}
          icon={BedDouble}
          tone={availableToday <= 2 ? "red" : "green"}
        />
        <KpiCard
          label={t("Revenu mensuel", "Monthly revenue")}
          value={formatCurrency(monthlyStats.revenue)}
          detail={`ADR ${formatCurrency(monthlyStats.adr)}`}
          trend={`RevPAR ${formatCurrency(monthlyStats.revpar)}`}
          icon={CreditCard}
          tone="gold"
        />
        <KpiCard
          label={t("Paiements en attente", "Pending payments")}
          value={String(pendingPayments)}
          detail={formatCurrency(monthlyStats.unpaidAmount)}
          trend={pendingPayments > 0 ? t("Relance", "Follow up") : t("À jour", "Up to date")}
          icon={ReceiptText}
          tone={pendingPayments > 0 ? "red" : "green"}
        />
      </section>

      <section className="mt-6">
        <SectionHeader
          title={t("Réservations récentes", "Recent bookings")}
          action={
            <Link to="/admin/reservations" className={adminButtonClasses("outline", "sm")}>
              {t("Voir tout", "View all")}
            </Link>
          }
        />
        <ReservationsTable compact />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DashboardPanel
          title={t("Alertes opérationnelles", "Operational alerts")}
          icon={AlertTriangle}
        >
          {alerts.length === 0 ? (
            <DashboardEmptyState
              title={t("Aucune alerte active", "No active alerts")}
              text={t("Les opérations du jour sont stables.", "Today's operations are stable.")}
            />
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-black text-primary">
                      {localizeAlertTitle(alert, locale)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        alert.severity === "critical"
                          ? "bg-red-50 text-red-700"
                          : alert.severity === "warning"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-sky-50 text-sky-800"
                      }`}
                    >
                      {localizeAlertSeverity(alert.severity, locale)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {localizeAlertDescription(alert, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title={t("Performance mensuelle", "Monthly performance")} icon={TrendingUp}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label={t("Revenu", "Revenue")}
              value={formatCurrency(monthlyStats.revenue)}
            />
            <MetricTile label="ADR" value={formatCurrency(monthlyStats.adr)} />
            <MetricTile label="RevPAR" value={formatCurrency(monthlyStats.revpar)} />
          </div>
          <div className="mt-5 space-y-4">
            <ProgressLine
              label={t("Occupation", "Occupancy")}
              value={`${occupancy}%`}
              percent={occupancy}
            />
            <ProgressLine
              label={t("Paiements encaissés", "Payments collected")}
              value={formatCurrency(monthlyStats.revenue - monthlyStats.unpaidAmount)}
              percent={
                monthlyStats.revenue > 0
                  ? ((monthlyStats.revenue - monthlyStats.unpaidAmount) / monthlyStats.revenue) *
                    100
                  : 0
              }
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title={t("Sources de réservation", "Booking sources")} icon={CreditCard}>
          {revenueBySource.length === 0 ? (
            <DashboardEmptyState
              title={t("Aucune source active", "No active sources")}
              text={t(
                "Les revenus par canal apparaîtront ici.",
                "Revenue by channel will appear here.",
              )}
            />
          ) : (
            <div className="space-y-4">
              {revenueBySource.map((item) => (
                <ProgressLine
                  key={item.source}
                  label={channelLabels[item.source as keyof typeof channelLabels] ?? item.label}
                  value={formatCurrency(safeNumber(item.revenue))}
                  percent={(safeNumber(item.revenue) / maxRevenue) * 100}
                />
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title={t("Chambres à surveiller", "Rooms to watch")} icon={BedDouble}>
          {roomsToWatch.length === 0 ? (
            <DashboardEmptyState
              title={t("Aucune chambre critique", "No critical rooms")}
              text={t(
                "Inventaire, maintenance et occupation sont sous contrôle.",
                "Inventory, maintenance and occupancy are under control.",
              )}
            />
          ) : (
            <div className="space-y-3">
              {roomsToWatch.map(({ room, occupied, available, ratio }) => (
                <div key={room.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-primary">
                        {localizeRoomName(room, locale)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-muted-foreground">
                        {occupied}/{safeNumber(room.totalUnits)} {t("occupées", "occupied")} ·{" "}
                        {available} {t("libres", "free")}
                      </div>
                    </div>
                    <StatusBadge kind="room" value={room.status} />
                  </div>
                  <ProgressLine
                    label={t("Occupation", "Occupancy")}
                    value={`${ratio}%`}
                    percent={ratio}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <ReceptionPanel
          title={t("Arrivées aujourd'hui", "Arrivals today")}
          items={arrivals}
          empty={t("Aucune arrivée confirmée.", "No confirmed arrivals.")}
        />
        <ReceptionPanel
          title={t("Départs aujourd'hui", "Departures today")}
          items={departures}
          empty={t("Aucun départ en attente.", "No pending departures.")}
        />
        <ReceptionPanel
          title={t("Clients présents", "Guests in house")}
          items={currentGuests}
          empty={t("Aucun client actuellement check-in.", "No guests currently checked in.")}
        />
      </section>

      {import.meta.env.DEV && (
        <DebugPanel
          status={status}
          supabaseConfigured={isSupabaseConfigured()}
          reservationsCount={reservationItems.length}
          roomsCount={roomItems.length}
          errorsCount={failedModules.length}
        />
      )}
    </AdminLayout>
  );
}

function DashboardHero({
  today,
  hotelStatus,
  occupancy,
  pendingPayments,
}: {
  today: string;
  hotelStatus: string;
  occupancy: number;
  pendingPayments: number;
}) {
  const { t, locale } = useI18n();
  const date = new Date(`${today}T12:00:00`);
  const formattedDate = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(Number.isNaN(date.getTime()) ? new Date() : date);

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/15 bg-ocean p-5 text-white shadow-[var(--shadow-premium)] md:p-6">
      <div className="marina-pattern absolute inset-0 opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-ocean via-primary to-turquoise/70" />
      <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-accent backdrop-blur">
            <Hotel className="size-4" />
            Marina Cap Monastir PMS
          </div>
          <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
            {t("Tableau de bord", "Dashboard")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/78">
            {formattedDate} · {hotelStatus} · {t("Occupation", "Occupancy")} {occupancy}% ·{" "}
            {t(
              `${pendingPayments} paiement${pendingPayments > 1 ? "s" : ""} en attente`,
              `${pendingPayments} pending payment${pendingPayments > 1 ? "s" : ""}`,
            )}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AdminNewReservationButton variant="warning" />
          <Link to="/admin/reservations" className={adminButtonClasses("secondary", "md")}>
            <Users className="size-4" />
            Check-in
          </Link>
          <Link to="/admin/payments" className={adminButtonClasses("secondary", "md")}>
            <CreditCard className="size-4" />
            {t("Paiement", "Payment")}
          </Link>
          <Link to="/admin/channels" className={adminButtonClasses("secondary", "md")}>
            <RefreshCw className="size-4" />
            Channels
          </Link>
        </div>
      </div>
    </section>
  );
}

function DashboardErrorCard({
  failedModules,
  onRetry,
}: {
  failedModules: Array<[string, string | null]>;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-black">
            {t("Impossible de charger certaines données", "Some data could not be loaded")}
          </h2>
          <ul className="mt-2 space-y-1">
            {failedModules.map(([module, error]) => (
              <li key={module} className="break-words">
                <span className="font-bold">{formatModuleName(module)}</span>
                {error ? `: ${error}` : null}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-400 bg-white/70 px-3 text-xs font-black transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <RefreshCw className="size-3.5" />
          {t("Réessayer", "Try again")}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-black text-primary">{title}</h2>
      {action}
    </div>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-primary">{title}</h2>
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      {children}
    </section>
  );
}

function DashboardEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/20 bg-secondary/60 p-6 text-center">
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-lg bg-card text-accent shadow-sm">
        <CheckCircle2 className="size-5" />
      </div>
      <div className="font-black text-primary">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-primary">{value}</div>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  percent,
  compact = false,
}: {
  label: string;
  value: string;
  percent: number;
  compact?: boolean;
}) {
  const width = Math.max(4, Math.min(100, Math.round(safeNumber(percent))));

  return (
    <div className={compact ? "mt-3" : undefined}>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-primary">{label}</span>
        <span className="text-right font-semibold text-muted-foreground">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent via-turquoise to-primary"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="skeleton-block h-8 w-64" />
        <div className="skeleton-block mt-3 h-4 w-full max-w-xl" />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-block h-10 w-full" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="skeleton-block h-5 w-48" />
              <div className="skeleton-block mt-3 h-3 w-64" />
            </div>
            <Loader2 className="size-5 animate-spin text-accent" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="mb-2 flex justify-between gap-3">
                  <div className="skeleton-block h-4 w-32" />
                  <div className="skeleton-block h-4 w-20" />
                </div>
                <div className="skeleton-block h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="skeleton-block h-5 w-40" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton-block h-10 w-full" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Debug panel (dev only) ─────────────────────────────────────────────────

function DebugPanel({
  status,
  supabaseConfigured,
  configured,
  reservationsCount,
  roomsCount,
  errorsCount,
  error,
}: {
  status: DashboardStatus;
  supabaseConfigured?: boolean;
  configured?: boolean;
  reservationsCount?: number;
  roomsCount?: number;
  errorsCount?: number;
  error?: string | null;
}) {
  const configuredValue = supabaseConfigured ?? configured ?? false;

  return (
    <div className="mt-8 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 font-mono text-[11px] text-amber-900 shadow-sm">
      <span className="font-bold">debug</span>
      <span>status={status}</span>
      <span>supabaseConfigured={String(configuredValue)}</span>
      <span>reservations={reservationsCount ?? 0}</span>
      <span>rooms={roomsCount ?? 0}</span>
      <span>dashboardErrors={errorsCount ?? (error ? 1 : 0)}</span>
      {error && <span className="text-red-700">error={error}</span>}
    </div>
  );
}

// ── Reception panel ────────────────────────────────────────────────────────

function ReceptionPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: Reservation[];
  empty: string;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-black text-primary">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <DashboardEmptyState
            title={empty}
            text={t("Aucune action immédiate à traiter.", "Nothing to handle right now.")}
          />
        ) : (
          items.map((reservation) => {
            const guest = reservation.guest ?? {
              fullName: t("Client", "Guest"),
              identityNumber: "-",
            };

            return (
              <div
                key={reservation.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-primary">{guest.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {reservation.reservationNumber ?? reservation.id}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {safeDateString(reservation.checkIn) || "-"} {t("au", "to")}{" "}
                  {safeDateString(reservation.checkOut) || "-"} · {guest.identityNumber}
                </div>
                {reservation.paymentStatus !== "paid" && (
                  <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                    {t("Rappel paiement avant check-in", "Payment reminder before check-in")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
