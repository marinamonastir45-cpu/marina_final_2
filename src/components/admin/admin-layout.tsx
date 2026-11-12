import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Anchor,
  BedDouble,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Crown,
  FileText,
  Globe,
  Home,
  Hotel,
  LogOut,
  Bell,
  MessageCircle,
  Menu,
  Plug,
  Search,
  Settings,
  Table2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  canAccessAdmin,
  getCurrentAdminProfile,
  signOutAdmin,
  type AdminProfile,
} from "@/lib/auth/adminAuth";
import { LanguageSwitch } from "@/components/language-switch";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import {
  getUnreadAdminConversationCount,
  listAdminConversations,
  subscribeToConversationMessages,
  type ConversationSummary,
} from "@/lib/services/messageService";
import { adminButtonClasses } from "./AdminButton";
import { AdminNewReservationButton } from "./AdminNewReservationModal";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onReservationCreated?: () => void | Promise<void>;
};

const navItems = [
  { to: "/admin", label: { fr: "Tableau de bord", en: "Dashboard" }, icon: Home },
  { to: "/admin/rooms", label: { fr: "Chambres", en: "Rooms" }, icon: BedDouble },
  { to: "/admin/reservations", label: { fr: "Réservations", en: "Bookings" }, icon: Table2 },
  {
    to: "/admin/messages",
    label: { fr: "Messages clients", en: "Guest messages" },
    icon: MessageCircle,
  },
  { to: "/admin/clients", label: { fr: "Clients", en: "Guests" }, icon: Users },
  { to: "/admin/calendar", label: { fr: "Calendrier", en: "Calendar" }, icon: CalendarDays },
  { to: "/admin/payments", label: { fr: "Paiements", en: "Payments" }, icon: CreditCard },
  { to: "/admin/invoices", label: { fr: "Factures", en: "Invoices" }, icon: FileText },
  { to: "/admin/settings", label: { fr: "Paramètres", en: "Settings" }, icon: Settings },
  { to: "/admin/channels", label: { fr: "Channels", en: "Channels" }, icon: Plug },
  { to: "/admin/statistics", label: { fr: "Statistiques", en: "Statistics" }, icon: TrendingUp },
  { to: "/admin/direction", label: { fr: "Direction", en: "Management" }, icon: Crown },
  { to: "/admin/port-tarifs", label: { fr: "Tarifs Port", en: "Marina rates" }, icon: Anchor },
  { to: "/admin/port-reservations", label: { fr: "Réservations Port", en: "Port bookings" }, icon: Anchor },
] as const;

export function AdminLayout({
  title,
  description,
  children,
  actions,
  onReservationCreated,
}: Props) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { t, pick } = useI18n();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestConversations, setLatestConversations] = useState<ConversationSummary[]>([]);
  const visibleNavItems = admin
    ? navItems.filter((item) => canAccessAdmin(admin.role, item.to))
    : navItems;

  useEffect(() => {
    let isMounted = true;

    void getCurrentAdminProfile().then((profile) => {
      if (isMounted) setAdmin(profile);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const refreshMessages = async () => {
      const [count, summaries] = await Promise.all([
        getUnreadAdminConversationCount(),
        listAdminConversations(),
      ]);
      if (!isMounted) return;
      setUnreadMessages(count);
      setLatestConversations(summaries.slice(0, 3));
    };

    void refreshMessages();
    const handleReadEvent = () => {
      void refreshMessages();
    };
    window.addEventListener("messages_marked_read", handleReadEvent);

    void subscribeToConversationMessages(() => {
      void refreshMessages();
    }).then((unsubscribe) => {
      cleanup = unsubscribe ?? undefined;
    });

    return () => {
      isMounted = false;
      window.removeEventListener("messages_marked_read", handleReadEvent);
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await signOutAdmin();
    navigate({ to: "/login" });
  };
  const notificationCount = unreadMessages;

  return (
    <div className="admin-shell min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-hidden border-r border-white/10 bg-ocean text-white shadow-2xl lg:block">
        <div className="marina-pattern absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-ocean to-[#041d2b]" />
        <div className="relative flex h-full flex-col">
          <BrandBlock />
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleNavItems.map((item) => (
              <AdminNavLink key={item.to} item={item} pathname={pathname} />
            ))}
            <div className="pt-2">
              <Link
                to="/"
                className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/20 px-3 py-2.5 text-sm font-black text-accent-light transition hover:bg-accent/35 hover:text-white"
              >
                <Globe className="size-4" />
                {t("Retour au site Web", "Back to the website")}
              </Link>
            </div>
          </nav>
          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-white/10 bg-white/8 p-4 text-xs leading-5 text-white/72 shadow-inner">
              <div className="font-semibold text-white">
                {t("Session sécurisée", "Secure session")}
              </div>
              <p className="mt-1">
                {t(
                  "Supabase Auth, rôles admin et politiques RLS restent actifs.",
                  "Supabase Auth, admin roles and RLS policies stay active.",
                )}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/76 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-20 flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:border-accent hover:bg-accent/10 lg:hidden"
                  aria-label={t("Ouvrir le menu admin", "Open the admin menu")}
                >
                  <Menu className="size-5" />
                </button>
                <div>
                  <div className="section-kicker">
                    <Hotel className="size-4" />
                    {t("Administration", "Administration")}
                  </div>
                  <h1 className="mt-2 text-2xl font-black leading-tight text-primary md:text-3xl">
                    {title}
                  </h1>
                </div>
              </div>
              {description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <label className="relative min-w-0 md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder={t(
                    "Rechercher client, chambre, facture...",
                    "Search guest, room, invoice...",
                  )}
                  className="admin-input h-11 rounded-xl border-primary/10 bg-card/90 pl-9 shadow-sm"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {admin && canAccessAdmin(admin.role, "/admin/reservations") && (
                  <AdminNewReservationButton variant="secondary" onCreated={onReservationCreated} />
                )}
                {actions}
                <LanguageSwitch className="h-11 rounded-xl" />
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen((value) => !value);
                      setProfileOpen(false);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-primary shadow-sm transition hover:border-accent hover:bg-accent/10"
                    aria-expanded={notificationsOpen}
                  >
                    <span className="relative">
                      <Bell className="size-4 text-accent" />
                      {unreadMessages > 0 && (
                        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive ring-2 ring-card" />
                      )}
                    </span>
                    {notificationCount}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-lift)]">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-black text-primary">
                          {t("Notifications", "Notifications")}
                        </div>
                        <div className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                          Live
                        </div>
                      </div>
                      <div className="space-y-2">
                        {latestConversations.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border bg-background p-3 text-center text-xs text-muted-foreground">
                            {t("Aucune notification pour le moment.", "No notifications yet.")}
                          </div>
                        ) : (
                          latestConversations.map((item) => (
                            <Link
                              key={item.id}
                              to="/admin/messages"
                              search={{ conversation: item.id }}
                              onClick={() => setNotificationsOpen(false)}
                              className="block rounded-lg border border-border bg-background p-3 text-xs transition hover:border-accent"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-bold text-primary">{item.clientName}</div>
                                {item.unreadAdminCount > 0 && (
                                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-black text-white">
                                    {item.unreadAdminCount}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 line-clamp-2 leading-5 text-muted-foreground">
                                {item.latestMessage?.body ??
                                  t("Conversation client", "Guest conversation")}
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((value) => !value);
                      setNotificationsOpen(false);
                    }}
                    className="inline-flex h-11 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left shadow-sm transition hover:border-accent hover:bg-accent/10"
                    aria-expanded={profileOpen}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <UserRound className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-28 truncate text-xs font-black text-primary">
                        {admin?.name ?? "Admin"}
                      </span>
                      <span className="block max-w-28 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {admin?.role ?? t("chargement", "loading")}
                      </span>
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-lift)]">
                      <div className="rounded-lg bg-secondary p-3">
                        <div className="font-black text-primary">{admin?.name ?? "Admin"}</div>
                        <div className="mt-1 text-xs font-medium text-muted-foreground">
                          {admin?.role ?? t("chargement", "loading")} | Marina Cap Monastir
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-bold text-primary transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="size-4" />
                        {t("Déconnexion", "Sign out")}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden size-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive md:inline-flex"
                  title={t("Déconnexion admin", "Admin sign-out")}
                  aria-label={t("Déconnexion admin", "Admin sign-out")}
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 md:px-6 lg:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/92 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition",
                  active && "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                <Icon className="size-4" />
                <span className="max-w-full truncate">{pick(item.label).split(" ")[0]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-primary"
          >
            <Menu className="size-4" />
            {t("Menu", "Menu")}
          </button>
        </nav>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-ocean/65 backdrop-blur-sm"
            aria-label={t("Fermer le menu admin", "Close the admin menu")}
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative h-full w-[min(22rem,88vw)] overflow-hidden bg-ocean text-white shadow-2xl">
            <div className="marina-pattern absolute inset-0 opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary via-ocean to-[#041d2b]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10">
                <BrandBlock compact />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="mr-4 inline-flex size-10 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white"
                  aria-label={t("Fermer le menu admin", "Close the admin menu")}
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {visibleNavItems.map((item) => (
                  <AdminNavLink key={item.to} item={item} pathname={pathname} />
                ))}
              </nav>
              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 text-sm font-bold text-white"
                >
                  <LogOut className="size-4" />
                  {t("Déconnexion", "Sign out")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-3 border-b border-white/10 p-5 transition hover:opacity-90",
        compact && "border-b-0",
      )}
    >
      <img
        src="/icons/icon-512.png?v=2"
        alt="Marina Cap Monastir"
        className="size-12 rounded-lg object-cover shadow-lg"
      />
      <div className="min-w-0">
        <div className="truncate font-black tracking-tight text-white">Marina Cap Monastir</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {t("Extranet hôtelier", "Hotel extranet")}
        </div>
      </div>
    </Link>
  );
}

function AdminNavLink({ item, pathname }: { item: (typeof navItems)[number]; pathname: string }) {
  const { pick } = useI18n();
  const Icon = item.icon;
  const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);

  return (
    <Link
      to={item.to}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/72 transition-all duration-200 hover:bg-white/10 hover:text-white",
        active &&
          "bg-white text-primary shadow-lg shadow-black/10 hover:bg-white hover:text-primary",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/80 transition",
          active && "bg-accent/18 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 truncate">{pick(item.label)}</span>
    </Link>
  );
}
