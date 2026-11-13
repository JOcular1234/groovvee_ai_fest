import { createHash } from "node:crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";

// Database-backed fixed-window limiter for the public chat endpoint — same
// pattern as lib/auth/rate-limit.ts, reusing the login_throttles table
// (key/attempts/windowStart/lockedUntil) as a generic keyed store. The
// "chat|" namespace prefix keeps chat and login counters separate without a
// migration, and because it's DB-backed it works correctly across serverless
// instances — no external rate-limit service needed.

export const CHAT_WINDOW_MS = 60_000;
export const CHAT_MAX_REQUESTS = 10;

function throttleKey(ip: string): string {
  return `chat|${createHash("sha256").update(`chat|${ip}`).digest("hex")}`;
}

export type ChatThrottleStatus =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

// Pure decision — exported for unit tests.
export function chatWindowDecision(
  attempts: number,
  windowStartMs: number,
  nowMs: number
):
  | { allowed: true; reset: boolean }
  | { allowed: false; retryAfterSec: number } {
  if (nowMs - windowStartMs > CHAT_WINDOW_MS)
    return { allowed: true, reset: true };
  if (attempts >= CHAT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil(
        (windowStartMs + CHAT_WINDOW_MS - nowMs) / 1000
      ),
    };
  }
  return { allowed: true, reset: false };
}

// Checks the window and records the request atomically in one transaction.
export async function consumeChatQuota(
  db: PrismaClient,
  ip: string,
  now: Date = new Date()
): Promise<ChatThrottleStatus> {
  const key = throttleKey(ip);
  return db.$transaction(async (tx) => {
    const row = await tx.loginThrottle.findUnique({ where: { key } });
    const d = chatWindowDecision(
      row?.attempts ?? 0,
      row?.windowStart.getTime() ?? 0,
      now.getTime()
    );
    if (!d.allowed) return { allowed: false, retryAfterSec: d.retryAfterSec };

    await tx.loginThrottle.upsert({
      where: { key },
      create: {
        key,
        attempts: 1,
        windowStart: now,
        lockedUntil: null,
      },
      update: {
        attempts: d.reset ? 1 : row!.attempts + 1,
        windowStart: d.reset || !row ? now : row.windowStart,
        lockedUntil: null,
      },
    });
    return { allowed: true };
  });
}
