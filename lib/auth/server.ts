import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, withDbRetry } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import {
  getAdminByToken,
  revokeSessionByToken,
  type SessionAdmin,
} from "@/lib/auth/session";

export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
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
  return admin;
}

export async function requireSuperAdmin(): Promise<SessionAdmin> {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") redirect("/admin");
  return admin;
}

export async function logoutCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionByToken(db, token);
}
