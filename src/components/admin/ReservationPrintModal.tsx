import { Hotel, Printer, X } from "lucide-react";
import { useEffect } from "react";
import { rooms, type Reservation } from "@/data/hotel";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localizeRoomName } from "@/lib/i18n/rooms";
import {
  calculatePaidAmount,
  calculateRemainingAmount,
} from "@/lib/services/paymentService";

type Props = {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
};

export function ReservationPrintModal({ reservation, open, onClose }: Props) {
  const { t, locale, formatCurrency } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !reservation) return null;

  const room = rooms.find((r) => r.id === reservation.roomId);
  const nightsCount = Math.max(1, reservation.nights || 1);

  // Robust unit price calculation - NEVER show NaN
  const unitPrice =
    typeof reservation.pricePerNight === "number" &&
    !isNaN(reservation.pricePerNight) &&
    reservation.pricePerNight > 0
      ? reservation.pricePerNight
      : room?.pricePerNight && room.pricePerNight > 0
        ? room.pricePerNight
        : Math.round(reservation.total / nightsCount);

  const paid = calculatePaidAmount(reservation.id);
  const remaining = calculateRemainingAmount(reservation.id);

  const todayStr = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const roomName = room ? localizeRoomName(room, "fr") : reservation.roomId;

  // Professional print handler using a dedicated hidden iframe:
  // Guarantees EXACTLY 1 clean A4 page without scrollbars, gray modals, or extra background pages!
  const handlePrint = () => {
    let iframe = document.getElementById("print-voucher-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-voucher-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Fiche de Réservation - ${reservation.reservationNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            color: #1e293b;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f3d56;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            color: #0f3d56;
            letter-spacing: 0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .brand-contact {
            font-size: 11px;
            color: #475569;
            margin-top: 8px;
            line-height: 1.5;
          }
          .doc-box {
            text-align: right;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 8px;
            padding: 10px 16px;
            min-width: 220px;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 900;
            color: #0f3d56;
            letter-spacing: 0.5px;
          }
          .doc-ref {
            font-family: monospace;
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin-top: 4px;
          }
          .doc-date {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .section-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            padding: 12px 14px;
          }
          .card-title {
            font-size: 11px;
            font-weight: 800;
            color: #0f3d56;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11.5px;
          }
          .info-label {
            color: #64748b;
          }
          .info-value {
            font-weight: 600;
            color: #0f172a;
            text-align: right;
          }
          .table-container {
            margin-bottom: 20px;
          }
          .table-title {
            font-size: 11px;
            font-weight: 800;
            color: #0f3d56;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .total-row {
            background: #f8fafc;
            font-weight: 700;
          }
          .balance-row {
            background: #f0fdf4;
            border-top: 2px solid #0f3d56;
            font-size: 12.5px;
            font-weight: 900;
            color: #0f3d56;
          }
          .notes-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
            padding: 10px 14px;
            margin-bottom: 24px;
            font-size: 10.5px;
            color: #475569;
            line-height: 1.5;
          }
          .notes-title {
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 10px;
          }
          .signature-box {
            border: 1px dashed #94a3b8;
            border-radius: 8px;
            height: 90px;
            padding: 8px 12px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
          }
          .signature-title {
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }
          .signature-hint {
            font-size: 9.5px;
            color: #94a3b8;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">MARINA CAP MONASTIR</div>
            <div class="brand-subtitle">Résidence Hôtelière & Port de Plaisance</div>
            <div class="brand-contact">
              Port de Plaisance, BP N°60 — 5000 Monastir, Tunisie<br>
              Tél : (+216) 73 468 300 / (+216) 73 462 305<br>
              Email : reservations@marinamonastir.tn · Web : www.marinamonastir.tn
            </div>
          </div>
          <div class="doc-box">
            <div class="doc-title">FICHE DE RÉSERVATION</div>
            <div class="doc-ref">N° ${reservation.reservationNumber}</div>
            <div class="doc-date">Date : ${todayStr}</div>
          </div>
        </div>

        <div class="section-grid">
          <div class="card">
            <div class="card-title">1. Informations Client</div>
            <div class="info-row">
              <span class="info-label">Nom & Prénom :</span>
              <span class="info-value">${reservation.guest.fullName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Téléphone :</span>
              <span class="info-value">${reservation.guest.phone || "—"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email :</span>
              <span class="info-value">${reservation.guest.email || "—"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">CIN / Passeport :</span>
              <span class="info-value">${reservation.guest.identityNumber || "—"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nationalité / Pays :</span>
              <span class="info-value">${reservation.guest.country || "Tunisie"}</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">2. Détails de l'Hébergement</div>
            <div class="info-row">
              <span class="info-label">Logement :</span>
              <span class="info-value" style="color: #0f3d56;">${roomName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date d'arrivée :</span>
              <span class="info-value">${reservation.checkIn} (à partir de 14h)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date de départ :</span>
              <span class="info-value">${reservation.checkOut} (jusqu'à 11h)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Durée du séjour :</span>
              <span class="info-value">${nightsCount} nuit${nightsCount > 1 ? "s" : ""}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Occupants :</span>
              <span class="info-value">${reservation.adults} adulte(s)${reservation.children > 0 ? " + " + reservation.children + " enfant(s)" : ""}</span>
            </div>
          </div>
        </div>

        <div class="table-container">
          <div class="table-title">3. Règlement & Facturation</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center" style="width: 80px;">Nuitées</th>
                <th class="text-right" style="width: 110px;">Prix / nuit</th>
                <th class="text-right" style="width: 120px;">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${roomName}</strong> — Logement simple</td>
                <td class="text-center">${nightsCount}</td>
                <td class="text-right">${unitPrice} DT</td>
                <td class="text-right"><strong>${reservation.total} DT</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="3" class="text-right">Montant payé / Acompte :</td>
                <td class="text-right" style="color: #15803d;">${paid} DT</td>
              </tr>
              <tr class="balance-row">
                <td colspan="3" class="text-right">SOLDE RESTANT À RÉGLER À L'ARRIVÉE :</td>
                <td class="text-right">${remaining} DT</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${
          reservation.specialRequests
            ? `<div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px;">
                <strong>Demandes particulières :</strong> ${reservation.specialRequests}
               </div>`
            : ""
        }

        <div class="notes-box">
          <div class="notes-title">Conditions d'accueil :</div>
          • Réception ouverte 24h/24. Présentation obligatoire d'une pièce d'identité valide lors du check-in.<br>
          • Les clés de l'appartement sont remises contre règlement du solde de séjour.<br>
          • Pour tout retard ou question, veuillez contacter la réception au (+216) 73 468 300.
        </div>

        <div class="signatures-grid">
          <div class="signature-box">
            <span class="signature-title">Signature du Client</span>
            <span class="signature-hint">Mention "Lu et approuvé"</span>
          </div>
          <div class="signature-box">
            <span class="signature-title">Cachet & Signature Réception</span>
            <span class="signature-hint">Marina Cap Monastir</span>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-6 flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Top bar (Modal Controls) */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Printer className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">
                {t("Fiche de Réservation", "Reservation Voucher")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("Aperçu officiel avant impression", "Official preview before printing")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-sm transition hover:bg-ocean"
            >
              <Printer className="size-4" />
              {t("Imprimer / PDF (1 page)", "Print / PDF (1 page)")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label={t("Fermer", "Close")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview */}
        <div className="max-h-[82vh] overflow-y-auto bg-slate-100 p-4 md:p-8">
          <div className="mx-auto max-w-[760px] rounded-xl border border-slate-300 bg-white p-8 text-slate-800 shadow-md">
            {/* Header */}
            <div className="flex flex-col justify-between border-b-2 border-primary pb-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <Hotel className="size-6 text-primary" />
                  <span className="text-xl font-black tracking-wide text-primary">
                    MARINA CAP MONASTIR
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Résidence Hôtelière & Port de Plaisance
                </p>
                <div className="mt-2 text-xs leading-5 text-slate-600">
                  <p>Port de Plaisance, BP N°60 — 5000 Monastir, Tunisie</p>
                  <p>Tél : (+216) 73 468 300 / (+216) 73 462 305</p>
                  <p>Email : reservations@marinamonastir.tn</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-right sm:mt-0">
                <div className="text-sm font-black text-primary">
                  FICHE DE RÉSERVATION
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-700">
                  N° {reservation.reservationNumber}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-500">
                  Date : {todayStr}
                </div>
              </div>
            </div>

            {/* Grid 2 Columns */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Client */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="border-b border-slate-200 pb-2 text-xs font-black uppercase tracking-wider text-primary">
                  1. Informations Client
                </h4>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nom & Prénom :</span>
                    <span className="font-bold text-slate-900">{reservation.guest.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone :</span>
                    <span className="font-semibold text-slate-800">
                      {reservation.guest.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email :</span>
                    <span className="text-slate-700">{reservation.guest.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CIN / Passeport :</span>
                    <span className="font-mono text-slate-800">
                      {reservation.guest.identityNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nationalité / Pays :</span>
                    <span className="text-slate-700">
                      {reservation.guest.country || "Tunisie"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Séjour */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="border-b border-slate-200 pb-2 text-xs font-black uppercase tracking-wider text-primary">
                  2. Détails de l'Hébergement
                </h4>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Logement :</span>
                    <span className="font-bold text-primary">{roomName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'arrivée :</span>
                    <span className="font-bold text-slate-900">
                      {reservation.checkIn} <span className="text-[10px] font-normal text-slate-500">(14h)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date de départ :</span>
                    <span className="font-bold text-slate-900">
                      {reservation.checkOut} <span className="text-[10px] font-normal text-slate-500">(11h)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Durée du séjour :</span>
                    <span className="font-semibold text-slate-800">
                      {nightsCount} {nightsCount > 1 ? "nuits" : "nuit"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Occupants :</span>
                    <span className="text-slate-800">
                      {reservation.adults} adulte(s)
                      {reservation.children > 0 && ` + ${reservation.children} enfant(s)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Facturation */}
            <div className="mt-6">
              <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-primary">
                3. Règlement & Facturation
              </h4>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-center">Nuitées</th>
                      <th className="px-4 py-2.5 text-right">Prix / nuit</th>
                      <th className="px-4 py-2.5 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {roomName} — Logement simple
                      </td>
                      <td className="px-4 py-3 text-center">{nightsCount}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(reservation.total)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-slate-600">
                        Montant payé / Acompte :
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                        {formatCurrency(paid)}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 font-black">
                      <td colSpan={3} className="px-4 py-2.5 text-right text-primary">
                        SOLDE RESTANT À RÉGLER À L'ARRIVÉE :
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-primary">
                        {formatCurrency(remaining)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Demandes particulières si existantes */}
            {reservation.specialRequests && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="font-bold text-slate-800">Demandes particulières : </span>
                <span className="text-slate-600">{reservation.specialRequests}</span>
              </div>
            )}

            {/* Consignes */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-[11px] leading-5 text-slate-600">
              <p className="font-bold text-slate-800">Conditions d'accueil :</p>
              <p>• Réception ouverte 24h/24. Présentation obligatoire d'une pièce d'identité en cours de validité.</p>
              <p>• Les clés de l'appartement sont remises contre règlement du solde de séjour.</p>
              <p>• Pour tout retard ou question, veuillez contacter la réception au (+216) 73 468 300.</p>
            </div>

            {/* Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-8 border-t border-slate-200 pt-5 text-center text-xs">
              <div className="flex min-h-[85px] flex-col justify-between rounded-lg border border-dashed border-slate-300 p-2.5">
                <span className="font-bold text-slate-700">Signature du Client</span>
                <span className="text-[10px] text-slate-400 italic">(Mention "Lu et approuvé")</span>
              </div>
              <div className="flex min-h-[85px] flex-col justify-between rounded-lg border border-dashed border-slate-300 p-2.5">
                <span className="font-bold text-slate-700">Cachet & Signature Réception</span>
                <span className="text-[10px] text-slate-400">Marina Cap Monastir</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
