import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { AdminModel } from "@/lib/generated/prisma/models";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACTIVITY_TOUCH_MS = 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: PrismaClient, adminId: string) {
  const token = generateSessionToken();
  const session = await db.session.create({
    data: {
      adminId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, session };
}

export type SessionAdmin = Pick<
  AdminModel,
  "id" | "name" | "email" | "role" | "isActive"
>;

export async function getAdminByToken(
  db: PrismaClient,
  token: string
): Promise<SessionAdmin | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Deactivated administrators lose access immediately.
  if (!session.admin.isActive) return null;

  if (Date.now() - session.lastActivityAt.getTime() > ACTIVITY_TOUCH_MS) {
    db.session
      .update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      })
      .catch(() => {});
  }

  return session.admin;
}

export async function revokeSessionByToken(
  db: PrismaClient,
  token: string
): Promise<void> {
  await db.session
    .deleteMany({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => {});
}

export async function revokeAllSessions(
  db: PrismaClient,
  adminId: string
): Promise<void> {
  await db.session.deleteMany({ where: { adminId } });
}

export async function cleanupExpiredSessions(
  db: PrismaClient
): Promise<number> {
  const { count } = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
