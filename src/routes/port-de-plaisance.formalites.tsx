import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Anchor,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  LogIn,
  LogOut,
  Phone,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/port-de-plaisance/formalites")({
  head: () => ({
    meta: [
      {
        title: headT(
          "Formalités Port — Marina Cap Monastir",
          "Marina formalities — Marina Cap Monastir",
        ),
      },
      {
        name: "description",
        content: headT(
          "Formalités d'entrée et de sortie du port de plaisance de Marina Cap Monastir — documents requis, procédures d'accueil, VHF, consignes de sécurité.",
          "Entry and exit formalities at the Marina Cap Monastir harbour — required documents, arrival procedures, VHF and safety rules.",
        ),
      },
    ],
  }),
  component: FormalitesPage,
});

const ARRIVAL_DOCS = [
  {
    fr: "Titre de navigation du bateau (acte de francisation ou certificat d'immatriculation)",
    en: "Boat navigation papers (certificate of registry or registration certificate)",
  },
  {
    fr: "Passeports en cours de validité de tous les membres d'équipage",
    en: "Valid passports for all crew members",
  },
  {
    fr: "Rôle d'équipage (liste des personnes à bord)",
    en: "Crew list (everyone on board)",
  },
  {
    fr: "Police d'assurance du bateau couvrant la responsabilité civile",
    en: "Boat insurance policy covering third-party liability",
  },
];

const DEPARTURE_DOCS = [
  {
    fr: "Règlement intégral des droits de port (escale, services, suppléments)",
    en: "Full payment of harbour dues (stay, services, extras)",
  },
  {
    fr: "Avis d'appareillage à la garde maritime",
    en: "Departure notice to the maritime guard",
  },
  {
    fr: "Notification préalable au minimum 2 h avant l'appareillage",
    en: "Notice at least 2 hours before departure",
  },
];

function FormalitesPage() {
  const { t, pick } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-ocean via-primary to-[#0a3f5c] py-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(214,168,79,0.22),transparent_65%)]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 md:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur">
            <FileCheck2 className="size-3.5 text-accent" />
            {t("Port de Plaisance", "Marina")}
          </div>
          <h1 className="page-title">
            {t("Formalités d'entrée et de sortie", "Entry and exit formalities")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
            {t(
              "Procédures et documents requis pour les plaisanciers à Marina Cap Monastir.",
              "Procedures and documents required for boaters at Marina Cap Monastir.",
            )}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6 space-y-8">
        <Link
          to="/port-de-plaisance"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t("Retour au port", "Back to the marina")}
        </Link>

        {/* VHF contact */}
        <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-black text-primary">{t("Contact VHF", "VHF contact")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "À l'approche du port, appelez la capitainerie sur le",
                "When approaching the harbour, call the harbour office on",
              )}{" "}
              <strong className="text-primary">{t("canal VHF 09", "VHF channel 09")}</strong>{" "}
              {t(
                "(ou canal 16 en secours). Un agent vous guidera pour l'accostage et vous attribuera un poste à quai.",
                "(or channel 16 as a backup). An agent will guide you in and assign you a berth.",
              )}
            </p>
          </div>
        </div>

        {/* Police Frontière — contenu officiel */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="h-1 bg-gradient-to-r from-primary to-turquoise" />
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-black text-primary">
              {t("Police Frontière", "Border police")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t(
                "Les formalités de police de frontière pour les plaisanciers en provenance de l'étranger concernant les membres de l'équipage et les passagers doivent être exécutées avant accès à terre et avant départ pour l'étranger. Ainsi une déclaration d'entrée est formulée par le capitaine du navire et visée par la police de frontière. Cette déclaration, qui sera présentée à toute réquisition des autorités dans les autres ports d'escale, vous dispensera de toute autre formalité.",
                "For boaters arriving from abroad, border police formalities for crew and passengers must be completed before going ashore and before leaving for a foreign destination. The skipper fills in an entry declaration, which is stamped by the border police. Show this declaration whenever the authorities ask for it in other ports of call; no other formality will be required.",
              )}
            </p>
            <h3 className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-muted-foreground">
              {t("Documents à présenter", "Documents to show")}
            </h3>
            <ul className="mt-2 space-y-2">
              {[
                t("Papiers du bateau", "Boat papers"),
                t("Passeport des passagers en cours de validité", "Valid passports for passengers"),
              ].map((doc) => (
                <li
                  key={doc}
                  className="flex items-start gap-2.5 text-sm leading-6 text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Arrivée */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-premium)]">
          <div className="h-1.5 bg-gradient-to-r from-accent via-turquoise to-primary" />
          <div className="p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <LogIn className="size-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-xl font-black text-primary">
                  {t("Procédure d'arrivée", "Arrival procedure")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("Entrée au port / Entry procedure", "Entering the harbour")}
                </p>
              </div>
            </div>

            <ol className="space-y-3">
              {[
                t(
                  "Appeler la capitainerie sur VHF 09/16 à l'approche du port.",
                  "Call the harbour office on VHF 09/16 when approaching the harbour.",
                ),
                t(
                  "Accoster au quai d'accueil désigné par la capitainerie.",
                  "Moor at the reception quay designated by the harbour office.",
                ),
                t(
                  "Se présenter au guichet de la capitainerie dans les 2 heures suivant l'arrivée.",
                  "Report to the harbour office desk within 2 hours of arrival.",
                ),
                t(
                  "Remettre les documents requis et régler l'acompte demandé.",
                  "Hand in the required documents and pay the requested deposit.",
                ),
                t(
                  "Retirer votre badge d'accès aux sanitaires et équipements communs.",
                  "Collect your access badge for the toilets and shared facilities.",
                ),
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-6 text-foreground">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-muted-foreground">
                {t("Documents à remettre", "Documents to hand in")}
              </h3>
              <ul className="space-y-2">
                {ARRIVAL_DOCS.map((doc) => (
                  <li
                    key={doc.fr}
                    className="flex items-start gap-2.5 text-sm leading-6 text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {pick(doc)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Départ */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-primary via-turquoise to-accent" />
          <div className="p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <LogOut className="size-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-black text-primary">
                  {t("Procédure de départ", "Departure procedure")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("Sortie du port / Departure procedure", "Leaving the harbour")}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {DEPARTURE_DOCS.map((doc) => (
                <li
                  key={doc.fr}
                  className="flex items-start gap-2.5 text-sm leading-6 text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  {pick(doc)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Règlement intérieur */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="h-1 bg-gradient-to-r from-ocean to-turquoise" />
          <div className="p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <ShieldCheck className="size-5 text-accent" />
              </div>
              <h2 className="text-xl font-black text-primary">
                {t("Consignes de sécurité & règlement", "Safety rules & regulations")}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  rule: t(
                    "5 nœuds vitesse maximale",
                    "Maximum speed in the harbour: 5 knots",
                  ),
                },
                {
                  rule: t(
                    "Amarrage interdit hors des postes désignés",
                    "Mooring only at designated berths",
                  ),
                },
                {
                  rule: t(
                    "Interdiction de rejets d'hydrocarbures ou déchets à l'eau",
                    "No discharge of fuel or waste into the water",
                  ),
                },
                {
                  rule: t(
                    "Respect du silence nocturne de 22h à 7h",
                    "Quiet hours from 10 pm to 7 am",
                  ),
                },
                {
                  rule: t(
                    "Interdiction de feu nu sur les pontons",
                    "No open flames on the pontoons",
                  ),
                },
                {
                  rule: t(
                    "Présence obligatoire d'extincteur à bord",
                    "A fire extinguisher on board is mandatory",
                  ),
                },
                {
                  rule: t(
                    "Port du gilet de sauvetage recommandé pour les enfants",
                    "Life jackets recommended for children",
                  ),
                },
                {
                  rule: t(
                    "Accès aux pontons réservé aux plaisanciers accrédités",
                    "Pontoon access for registered boaters only",
                  ),
                },
              ].map((item) => (
                <div
                  key={item.rule}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground"
                >
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  {item.rule}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Urgence & Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-black text-red-800">{t("Urgences", "Emergencies")}</h3>
            <div className="mt-3 space-y-2 text-sm text-red-900">
              <p>
                <strong>{t("SAR Tunisie :", "SAR Tunisia:")}</strong> 70 717 171
              </p>
              <p>
                <strong>{t("SAMU :", "Ambulance (SAMU):")}</strong> 190
              </p>
              <p>
                <strong>{t("Police :", "Police:")}</strong> 197
              </p>
              <p>
                <strong>{t("Pompiers :", "Fire brigade:")}</strong> 198
              </p>
              <p className="pt-1 text-xs opacity-75">
                {t("Ou VHF canal 16 (détresse)", "Or VHF channel 16 (distress)")}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <h3 className="font-black text-primary">{t("Capitainerie", "Harbour office")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("BP.N°60 - 5000 Monastir, Tunisie", "PO Box 60 - 5000 Monastir, Tunisia")}
            </p>
            <div className="mt-3 space-y-2">
              <a
                href="tel:+21673462305"
                className="flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary"
              >
                <Phone className="size-4 text-accent" />
                (+216) 73 46 23 05
              </a>
              <a
                href="tel:+21673462066"
                className="flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary"
              >
                <Phone className="size-4 text-accent" />
                (+216) 73 46 20 66
              </a>
            </div>
            <div className="mt-4">
              <Link
                to="/port-de-plaisance/reservation"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-ocean"
              >
                <Anchor className="size-3.5" />
                {t("Réserver en ligne", "Book online")}
              </Link>
            </div>
          </div>
        </div>
      </main>
      {import.meta.env.DEV && (
        <div className="fixed bottom-2 right-2 z-[9999] rounded bg-black/70 px-2 py-1 text-[10px] text-white">
          /port-de-plaisance/formalites · FormalitesPage
        </div>
      )}
    </div>
  );
}
