import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ConciergeBell,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { BookingSummary } from "@/components/booking-summary";
import { SiteHeader } from "@/components/site-header";
import { calculateTotal, getRoomCapacity } from "@/data/hotel";
import { getCurrentSessionProfile, getDefaultPathForRole } from "@/lib/auth/profilesAuth";
import { bookingStore } from "@/lib/booking-store";
import { getBookingQuote, type BookingQuote } from "@/lib/services/bookingQuoteService";
import { createClientReservation } from "@/lib/services/reservationService";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localizeRoomName } from "@/lib/i18n/rooms";
import { getRoomType } from "@/lib/services/roomService";

export const Route = createFileRoute("/book/$id")({
  beforeLoad: async ({ params }) => {
    const context = await getCurrentSessionProfile();
    if (!context) {
      throw redirect({ to: "/login", search: { redirect: `/book/${params.id}` } });
    }
    if (context.profile.role !== "client") {
      throw redirect({ to: getDefaultPathForRole(context.profile.role) as never });
    }
    return { clientProfile: context.profile };
  },
  loader: async ({ params }) => {
    const room = await getRoomType(params.id);
    if (!room) throw notFound();
    return { room };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? headT(
              `Réserver ${loaderData.room.name} - Marina Cap Monastir`,
              `Book ${localizeRoomName(loaderData.room, getRequestLocale())} - Marina Cap Monastir`,
            )
          : headT("Réservation - Marina Cap Monastir", "Booking - Marina Cap Monastir"),
      },
      {
        name: "description",
        content: headT(
          "Finalisez votre réservation à Marina Cap Monastir.",
          "Complete your booking at Marina Cap Monastir.",
        ),
      },
    ],
  }),
  notFoundComponent: BookNotFound,
  component: BookPage,
});

const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
const afterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
const iso = (date: Date) => date.toISOString().slice(0, 10);

function BookNotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Link
          to="/search"
          search={{ adults: 2, children: 0, roomType: "Tous" }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t("Voir les appartements", "See the apartments")}
        </Link>
      </div>
    </div>
  );
}

function BookPage() {
  const { room } = Route.useLoaderData();
  const { t, locale } = useI18n();
  const { clientProfile } = Route.useRouteContext();
  const navigate = useNavigate();
  const draft = bookingStore.get();
  const checkIn = draft.checkIn ?? iso(tomorrow);
  const checkOut = draft.checkOut ?? iso(afterTomorrow);
  const adults = draft.adults || 2;
  const children = draft.children || 0;
  const capacity = getRoomCapacity(room);
  const fallbackBreakdown = useMemo(
    () => calculateTotal(room, checkIn, checkOut),
    [room, checkIn, checkOut],
  );
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const breakdown = quote?.breakdown ?? fallbackBreakdown;
  const availability = quote?.availability ?? room.totalUnits;
  const selectedNightPrice =
    breakdown.nights > 0 ? Math.round(breakdown.roomPrice / breakdown.nights) : room.pricePerNight;

  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(locale === "en" ? "Tunisia" : "Tunisie");
  const [identityNumber, setIdentityNumber] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setQuoteLoading(true);
    void getBookingQuote(room, checkIn, checkOut)
      .then((nextQuote) => {
        if (!isMounted) return;
        setQuote(nextQuote);
        setQuoteLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setQuote(null);
        setQuoteLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [room, checkIn, checkOut]);

  const validGuest =
    phone.trim().length > 5 && country.trim().length > 1 && identityNumber.trim().length > 3;
  const fitsCapacity = adults + children <= capacity;
  const canSubmit =
    validGuest && fitsCapacity && breakdown.nights > 0 && Boolean(quote?.canBook) && !quoteLoading;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      const reservation = await createClientReservation({
        roomId: room.id,
        checkIn,
        checkOut,
        adults,
        children,
        phone,
        country,
        identityNumber,
        specialRequests,
      });
      navigate({ to: "/confirmation", search: { reservation: reservation.reservationNumber } });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Impossible de créer la réservation.", "The booking could not be created."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link
          to="/room/$id"
          params={{ id: room.id }}
          search={{ checkIn, checkOut, adults, children }}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t("Retour à l'appartement", "Back to the apartment")}
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_390px]">
          <form onSubmit={submit} className="space-y-8">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                <UserRound className="size-3.5" />
                {t("Informations client", "Guest details")}
              </div>
              <h1 className="page-title text-primary">
                {t("Finaliser la réservation", "Complete your booking")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {t(
                  "Ces informations seront utilisées pour la confirmation et l'accueil à la réception.",
                  "These details are used for your confirmation and check-in at reception.",
                )}
              </p>
            </div>

            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)]">
              <div className="border-b border-border bg-secondary/50 px-5 py-3">
                <h2 className="text-sm font-bold text-primary">
                  {t("Informations personnelles", "Personal details")}
                </h2>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-secondary/60 px-4 py-3 text-sm">
                  <UserRound className="size-4 shrink-0 text-accent" />
                  <span className="font-semibold text-primary">
                    {t("Réservation au nom de", "Booking in the name of")}
                  </span>
                  <span className="font-black text-primary">{clientProfile.fullName}</span>
                  <span className="text-muted-foreground">({clientProfile.email})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("Téléphone", "Phone")} required>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+216 ..."
                      className="field-input"
                      required
                    />
                  </Field>
                  <Field label={t("Pays", "Country")} required>
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="field-input"
                      required
                    />
                  </Field>
                  <Field label={t("CIN / Passeport", "ID card / Passport")} required>
                    <input
                      value={identityNumber}
                      onChange={(event) => setIdentityNumber(event.target.value)}
                      placeholder={t("Référence d'identité", "ID number")}
                      className="field-input"
                      required
                    />
                  </Field>
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("Demandes spéciales", "Special requests")}
                    </span>
                    <textarea
                      value={specialRequests}
                      onChange={(event) => setSpecialRequests(event.target.value)}
                      placeholder={t(
                        "Arrivée tardive, lit bébé, place de parking...",
                        "Late arrival, baby cot, parking space...",
                      )}
                      rows={4}
                      className="field-input min-h-28"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-turquoise/25 bg-gradient-to-br from-turquoise/8 to-turquoise/4 p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-primary">
                <ShieldCheck className="size-5 text-turquoise" />
                {t("Confirmation", "Confirmation")}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {t(
                  "Aucun numéro de carte ni CVC n'est collecté ou stocké. Votre réservation est confirmée directement et enregistrée auprès de l'équipe Marina Cap Monastir.",
                  "No card number or CVC is collected or stored. Your booking is confirmed directly and recorded with the Marina Cap Monastir team.",
                )}
              </p>
            </section>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  icon: <ShieldCheck className="size-4 text-emerald-600" />,
                  text: t("Réservation sécurisée", "Secure booking"),
                },
                {
                  icon: <Zap className="size-4 text-turquoise" />,
                  text: t("Réponse rapide de la réception", "Quick reply from reception"),
                },
                {
                  icon: <ConciergeBell className="size-4 text-accent" />,
                  text: t("Réception disponible", "Reception available"),
                },
              ].map((badge) => (
                <div
                  key={badge.text}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-xs font-semibold text-muted-foreground shadow-sm"
                >
                  {badge.icon}
                  {badge.text}
                </div>
              ))}
            </div>

            {!fitsCapacity && (
              <p className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
                {t(
                  `La capacité demandée dépasse la capacité de cet appartement (${capacity} personnes).`,
                  `The number of guests exceeds this apartment's capacity (${capacity} guests).`,
                )}
              </p>
            )}

            {quoteLoading && (
              <p className="rounded-lg bg-secondary p-4 text-sm font-medium text-muted-foreground">
                {t(
                  "Vérification du tarif et de la disponibilité...",
                  "Checking rate and availability...",
                )}
              </p>
            )}

            {!quoteLoading && quote?.reason && (
              <p className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
                {quote.reason}
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-ocean hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <CalendarCheck className="size-5" />
              {submitting
                ? t("Envoi en cours...", "Sending...")
                : t("Envoyer la demande de réservation", "Send booking request")}
            </button>
          </form>

          <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <BookingSummary
              room={room}
              breakdown={breakdown}
              checkIn={checkIn}
              checkOut={checkOut}
              nightlyPrice={selectedNightPrice}
              nightlyRates={quote?.nightlyRates ?? []}
            />
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="space-y-2.5 text-xs font-medium text-muted-foreground">
                {[
                  {
                    icon: <CheckCircle2 className="size-3.5 text-emerald-600" />,
                    text: t(
                      `Disponibilité : ${availability} unité${availability > 1 ? "s" : ""} sur ces dates`,
                      `Availability: ${availability} unit${availability > 1 ? "s" : ""} on these dates`,
                    ),
                  },
                  {
                    icon: <ShieldCheck className="size-3.5 text-turquoise" />,
                    text: t("Aucune carte bancaire requise", "No bank card required"),
                  },
                  {
                    icon: <ConciergeBell className="size-3.5 text-accent" />,
                    text: t(
                      "Présentez votre confirmation à la réception",
                      "Show your confirmation at reception",
                    ),
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
