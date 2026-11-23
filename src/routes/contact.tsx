import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Loader2, LogIn, Mail, MapPin, Phone, Send, ShipWheel, UserCheck, UserCircle2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import heroImg from "@/assets/hero-marina.jpg";
import { SiteHeader } from "@/components/site-header";
import { getCurrentProfile } from "@/lib/auth/profilesAuth";
import { headT } from "@/lib/i18n/head";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getHotelSettings } from "@/lib/services/settingsService";
import { createContactConversation } from "@/lib/services/reservationMessageService";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const [settings, userProfile] = await Promise.all([
      getHotelSettings(),
      getCurrentProfile().catch(() => null),
    ]);
    return { settings, userProfile };
  },
  head: () => ({
    meta: [
      { title: headT("Contacter - Marina Cap Monastir", "Contact us - Marina Cap Monastir") },
      {
        name: "description",
        content: headT(
          "Contactez la réception et la capitainerie de Marina Cap Monastir.",
          "Contact the Marina Cap Monastir reception and harbour office.",
        ),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  const { settings, userProfile } = Route.useLoaderData();

  const [fullName, setFullName] = useState(userProfile?.fullName ?? userProfile?.name ?? "");
  const [email, setEmail] = useState(userProfile?.email ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [subject, setSubject] = useState("Réservation Appart-Hôtel");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      if (!fullName) setFullName(userProfile.fullName ?? userProfile.name ?? "");
      if (!email) setEmail(userProfile.email ?? "");
      if (!phone && userProfile.phone) setPhone(userProfile.phone);
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !message.trim()) {
      setErrorMessage(
        t(
          "Veuillez remplir au moins votre nom et votre message.",
          "Please fill in at least your name and your message.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const res = await createContactConversation({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      subject,
      message: message.trim(),
    });

    setSubmitting(false);
    if (res.success) {
      setSentSuccess(true);
      setMessage("");
    } else {
      setErrorMessage(
        res.error || t("Erreur lors de l'envoi du message.", "The message could not be sent."),
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <img
            src={heroImg}
            alt="Marina Cap Monastir"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="luxury-hero-overlay absolute inset-0" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 text-white md:px-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] shadow-lg backdrop-blur">
              <ShipWheel className="size-4 text-accent" />
              {t("Contacter", "Contact us")}
            </div>
            <h1 className="hero-title max-w-3xl">
              {t("Contacter Marina Cap Monastir", "Contact Marina Cap Monastir")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/78">
              {t(
                "Réception pour l'appart-hôtel, capitainerie pour le port de plaisance et les escales.",
                "Reception for the aparthotel, harbour office for the marina and stopovers.",
              )}
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <InfoCard title={t("Appart Hôtel / Réception", "Aparthotel / Reception")}>
              <Info icon={<Phone className="size-5" />} label={t("Téléphone", "Phone")} value={settings.phone} href="tel:+21673462305" />
              <Info icon={<Mail className="size-5" />} label={t("Réservation", "Bookings")} value={settings.email} href={`mailto:${settings.email}`} />
              <Info icon={<Mail className="size-5" />} label={t("Marketing", "Marketing")} value={settings.marketingEmail} href={`mailto:${settings.marketingEmail}`} />
              <Info icon={<MapPin className="size-5" />} label={t("Adresse", "Address")} value={settings.address} />
            </InfoCard>

            <InfoCard title={t("Capitainerie", "Harbour office")}>
              {settings.capitaineriePhones.map((phone) => (
                <Info key={phone} icon={<Phone className="size-5" />} label={t("Téléphone", "Phone")} value={phone} href={`tel:${toTel(phone)}`} />
              ))}
              <Info
                icon={<Mail className="size-5" />}
                label="Email"
                value={settings.capitainerieEmail}
                href={`mailto:${settings.capitainerieEmail}`}
              />
              <Info icon={<MapPin className="size-5" />} label={t("Adresse", "Address")} value={settings.address} />
            </InfoCard>

            <Link
              to="/search"
              search={{ adults: 2, children: 0, roomType: "Tous" }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-ocean"
            >
              <CalendarDays className="size-4" />
              {t("Réserver maintenant", "Book now")}
            </Link>
          </div>

          {!userProfile ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-card p-8 text-center shadow-[var(--shadow-premium)]">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserCircle2 className="size-8" />
              </div>
              <h3 className="text-2xl font-black text-primary">
                {t("Compte Client Requis", "Guest account required")}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                {t(
                  "Pour envoyer un message à la réception de Marina Cap Monastir et recevoir votre réponse directement dans votre espace client, veuillez vous connecter à votre compte.",
                  "To message the Marina Cap Monastir reception and get the reply straight in your guest account, please sign in.",
                )}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/login"
                  search={{ redirect: "/contact" }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-ocean"
                >
                  <LogIn className="size-4" />
                  {t("Se connecter", "Sign in")}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
                >
                  {t("Créer un compte", "Create an account")}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-premium)]">
              <div className="mb-4 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
                <UserCheck className="size-4 text-emerald-600" />
                <span>
                  {t("Connecté en tant que", "Signed in as")} {userProfile.fullName || userProfile.name} ({userProfile.email})
                </span>
              </div>

              {sentSuccess && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-sm font-semibold">
                    {t(
                      "Votre message a été transmis à la réception avec succès ! Nous vous répondrons sous peu.",
                      "Your message has been sent to reception. We will reply shortly.",
                    )}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                  {errorMessage}
                </div>
              )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("Nom complet", "Full name")}>
                <input
                  required
                  readOnly={!!userProfile}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`field-input ${userProfile ? "bg-muted/50 cursor-not-allowed font-semibold text-foreground/80" : ""}`}
                  placeholder={t("Nom et prénom", "First and last name")}
                />
              </Field>
              <Field label={t("Email", "Email")}>
                <input
                  type="email"
                  required
                  readOnly={!!userProfile}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`field-input ${userProfile ? "bg-muted/50 cursor-not-allowed font-semibold text-foreground/80" : ""}`}
                  placeholder="client@email.com"
                />
              </Field>
              <Field label={t("Téléphone", "Phone")}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field-input"
                  placeholder="+216 ..."
                />
              </Field>
              <Field label={t("Objet", "Subject")}>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="field-input"
                >
                  {/* Values stay in French: they prefix the message read by the reception team */}
                  <option value="Réservation Appart-Hôtel">{t("Réservation Appart-Hôtel", "Aparthotel booking")}</option>
                  <option value="Réservation Port de Plaisance">{t("Réservation Port de Plaisance", "Berth booking")}</option>
                  <option value="Capitainerie">{t("Capitainerie", "Harbour office")}</option>
                  <option value="Demande spéciale">{t("Demande spéciale", "Special request")}</option>
                </select>
              </Field>
              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("Message", "Message")}
                </span>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="field-input min-h-36"
                  placeholder={t(
                    "Dates, nombre de voyageurs, demande port, préférence d'appartement...",
                    "Dates, number of guests, berth request, apartment preference...",
                  )}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-ocean disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? t("Envoi en cours...", "Sending...") : t("Envoyer la demande", "Send request")}
            </button>
          </form>
        )}
        </section>
      </main>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="premium-card premium-card-hover rounded-lg p-5">
      <h2 className="mb-4 text-lg font-black text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <a href={href} className="font-semibold text-primary hover:text-accent">
      {value}
    </a>
  ) : (
    <span className="font-semibold text-primary">{value}</span>
  );

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 leading-6">{content}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function toTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}
