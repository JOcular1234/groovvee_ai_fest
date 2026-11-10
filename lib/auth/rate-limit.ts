import { createHash } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";

// Database-backed fixed-window limiter — shared across all app instances
// (serverless-safe, no external store required).
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

function throttleKey(email: string, ip: string): string {
  return createHash("sha256").update(`${email}|${ip}`).digest("hex");
}

export type ThrottleStatus =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export async function checkLoginThrottle(
  db: PrismaClient,
  email: string,
  ip: string
): Promise<ThrottleStatus> {
  const row = await db.loginThrottle.findUnique({
    where: { key: throttleKey(email, ip) },
  });
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil(
        (row.lockedUntil.getTime() - Date.now()) / 1000
      ),
    };
  }
  return { allowed: true };
}

export async function recordFailedLogin(
  db: PrismaClient,
  email: string,
  ip: string
): Promise<void> {
  const key = throttleKey(email, ip);
  const now = new Date();

  await db.$transaction(async (tx) => {
    const row = await tx.loginThrottle.findUnique({ where: { key } });
    const windowExpired =
      !row || now.getTime() - row.windowStart.getTime() > LOGIN_WINDOW_MS;

    const attempts = windowExpired ? 1 : row.attempts + 1;
    const lockedUntil =
      attempts >= LOGIN_MAX_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_LOCK_MS)
        : null;

    await tx.loginThrottle.upsert({
      where: { key },
      create: {
        key,
        attempts,
        windowStart: now,
        lockedUntil,
      },
      update: {
        attempts,
        windowStart: windowExpired || !row ? now : row.windowStart,
        lockedUntil,
      },
    });
  });
}

export async function clearLoginThrottle(
  db: PrismaClient,
  email: string,
  ip: string
): Promise<void> {
  await db.loginThrottle
    .delete({ where: { key: throttleKey(email, ip) } })
    .catch(() => {});
}
