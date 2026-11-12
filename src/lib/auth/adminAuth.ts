import { redirect } from "@tanstack/react-router";
import { tr } from "@/lib/i18n/locale";
import type { ProfileRole, UserProfile } from "./profilesAuth";
import {
  getCurrentProfile,
  requireProfileRole,
  signInWithPasswordAndProfile,
  signOut,
} from "./profilesAuth";

export type AdminRole = "admin" | "owner" | "capitainerie";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export type AdminProfile = AdminUser & {
  userId: string;
  active: boolean;
};

const CAPITAINERIE_PATHS = ["/admin/port-reservations", "/admin/port-tarifs"];

function isAdminAppRole(role: ProfileRole): role is AdminRole {
  return role === "admin" || role === "owner" || role === "capitainerie";
}

export async function signInAdmin(email: string, password: string) {
  const context = await signInWithPasswordAndProfile(email, password);
  if (!isAdminAppRole(context.profile.role)) {
    await signOut();
    throw new Error(
      tr("Compte admin non autorisé.", "This account is not authorised for the admin."),
    );
  }

  return mapAdminProfile(context.profile);
}

export async function signOutAdmin() {
  await signOut();
}

export async function getCurrentAdmin() {
  const profile = await getCurrentAdminProfile();
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  };
}

export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminAppRole(profile.role)) return null;
  return mapAdminProfile(profile);
}

export function canAccessAdmin(role: AdminRole, pathname = "/admin") {
  if (pathname === "/admin/login") return true;
  if (role === "admin" || role === "owner") return true;
  if (role === "capitainerie") {
    return CAPITAINERIE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return false;
}

export async function requireAdmin(pathname = "/admin") {
  const context = await requireProfileRole(["admin", "owner", "capitainerie"], pathname);
  const profile = mapAdminProfile(context.profile);

  if (!canAccessAdmin(profile.role, pathname)) {
    throw redirect({ to: getDefaultAdminPath(profile.role) });
  }

  return profile;
}

export function getDefaultAdminPath(role?: AdminRole) {
  return role === "capitainerie" ? "/admin/port-reservations" : "/admin";
}

function mapAdminProfile(profile: UserProfile): AdminProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.fullName,
    email: profile.email,
    role: profile.role as AdminRole,
    active: true,
  };
}
