import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { listBoatStays, type BoatStay } from "@/lib/services/boatStayService";

export const Route = createFileRoute("/admin/port-reservations")({
  head: () => ({
    meta: [
      {
        title: headT(
          "Réservations Port - Marina Cap Monastir",
          "Port bookings - Marina Cap Monastir"
        ),
      },
    ],
  }),
  loader: async () => {
    try {
      const stays = await listBoatStays();
      return { stays, error: null as string | null };
    } catch (err) {
      return {
        stays: [] as BoatStay[],
        error: err instanceof Error ? err.message : "Erreur de chargement",
      };
    }
  },
  component: AdminPortReservationsPage,
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    expected: { label: "Attendu", color: "bg-blue-100 text-blue-800" },
    arrived: { label: "En escale", color: "bg-green-100 text-green-800" },
    departed: { label: "Parti", color: "bg-gray-100 text-gray-700" },
    cancelled: { label: "Annulé", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}
    >
      {s.label}
    </span>
  );
}

function AdminPortReservationsPage() {
  const { t } = useI18n();
  const { stays, error } = Route.useLoaderData();
  const [search, setSearch] = useState("");

  const filtered = stays.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.boatName.toLowerCase().includes(q) ||
      s.ownerFullName.toLowerCase().includes(q) ||
      s.ownerPhone.includes(q) ||
      s.ownerEmail.toLowerCase().includes(q) ||
      s.reservationNumber.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title={t("Réservations Port", "Port bookings")}>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-primary">
            {t("Réservations Port", "Port bookings")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Toutes les escales enregistrées au port de plaisance",
              "All registered boat stays at the marina"
            )}
          </p>
        </div>

        {/* Search bar */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder={t(
              "Rechercher par bateau, propriétaire, téléphone...",
              "Search by boat, owner, phone..."
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-border bg-card px-4 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {t("escale(s)", "booking(s)")}
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3 whitespace-nowrap">Référence</th>
                <th className="px-4 py-3 whitespace-nowrap">Bateau</th>
                <th className="px-4 py-3 whitespace-nowrap">Propriétaire</th>
                <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                <th className="px-4 py-3 whitespace-nowrap">Dimensions</th>
                <th className="px-4 py-3 whitespace-nowrap">Arrivée</th>
                <th className="px-4 py-3 whitespace-nowrap">Départ</th>
                <th className="px-4 py-3 whitespace-nowrap">Acompte</th>
                <th className="px-4 py-3 whitespace-nowrap">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {search
                      ? t("Aucun résultat pour cette recherche", "No results found")
                      : t("Aucune escale enregistrée", "No boat stays recorded")}
                  </td>
                </tr>
              ) : (
                filtered.map((stay) => (
                  <tr
                    key={stay.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-accent font-bold whitespace-nowrap">
                      {stay.reservationNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary">
                        {stay.boatName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stay.boatType}
                        {stay.flag ? ` · ${stay.flag}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{stay.ownerFullName}</div>
                      {stay.nationality && (
                        <div className="text-xs text-muted-foreground">
                          {stay.nationality}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs whitespace-nowrap">
                        {stay.ownerPhone}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stay.ownerEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {stay.length != null ? `${stay.length}m` : "—"}
                      {stay.width != null ? ` × ${stay.width}m` : ""}
                      {stay.draught != null ? ` · T: ${stay.draught}m` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {stay.arrivalDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {stay.departureDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                      {stay.depositAmount != null
                        ? `${stay.depositAmount} ${stay.depositCurrency}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(stay.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
