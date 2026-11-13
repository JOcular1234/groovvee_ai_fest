import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { db, withDbRetry } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import {
  hasSectionAccess,
  type AccessLevel,
  type AdminSection,
} from "@/lib/auth/permissions";
import {
  getAdminByToken,
  revokeSessionByToken,
  type SessionAdmin,
} from "@/lib/auth/session";

export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
  // Declares request-time rendering: the session lookup below uses unstable
  // values (Date comparisons) that must never run inside the static shell.
  await connection();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Always checked against the database — role and active status are never
  // trusted from client-supplied data.
  return withDbRetry(() => getAdminByToken(db, token));
}

export async function requireAdmin(): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  // A pending forced password change locks the account out of every admin
  // screen and server action until it is resolved. The change-password
  // page lives outside the (protected) group and uses getCurrentAdmin
  // directly, so it can't redirect to itself.
  if (admin.mustChangePassword) redirect("/admin/change-password");
  return admin;
}

export async function requireSuperAdmin(): Promise<SessionAdmin> {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") redirect("/admin");
  return admin;
}

// Fails closed: any admin — including SUPER_ADMIN, which short-circuits —
// without the grant is bounced to the overview rather than shown the
// section. Called from section layouts (reads) and server actions (writes);
// hiding navigation items is never the enforcement layer.
export async function requireSectionAccess(
  section: AdminSection,
  level: AccessLevel
): Promise<SessionAdmin> {
  const admin = await requireAdmin();
  if (!hasSectionAccess(admin, section, level)) redirect("/admin");
  return admin;
}

export async function logoutCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionByToken(db, token);
}
