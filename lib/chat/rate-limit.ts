import { createHash } from "node:crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { hashKey, hitLimit, hitLimits } from "@/lib/rate-limit";

// Limits for the public chat endpoint, on the shared DB-backed limiter
// (lib/rate-limit.ts). Namespaced keys keep chat and login counters apart.

export const CHAT_WINDOW_MS = 60_000;
export const CHAT_MAX_REQUESTS = 10;

function throttleKey(ip: string): string {
  return `chat|${createHash("sha256").update(`chat|${ip}`).digest("hex")}`;
}

// Pure model of the per-minute burst rule enforced by hitLimit below —
// exported for unit tests.
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

// Daily budgets bound total Gemini spend no matter how many IPs are used:
// CHAT_IP_DAILY_LIMIT per visitor IP, CHAT_DAILY_LIMIT across all traffic
// (both per UTC day). Set a billing budget alert in Google Cloud as well —
// this cap limits requests, the alert catches surprises in token usage.
function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}
export const chatDailyLimit = () => envInt("CHAT_DAILY_LIMIT", 2000);
export const chatIpDailyLimit = () => envInt("CHAT_IP_DAILY_LIMIT", 150);

const DAY_MS = 24 * 60 * 60 * 1000;

function secondsToUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export type ChatQuotaStatus =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; scope: "burst" | "daily" };

// Atomic per-request accounting (see lib/rate-limit.ts). The burst limit is
// checked first so rapid-fire requests are refused without touching the
// daily budgets.
export async function consumeChatQuota(
  db: PrismaClient,
  ip: string,
  now: Date = new Date()
): Promise<ChatQuotaStatus> {
  const burst = await hitLimit(
    db,
    throttleKey(ip),
    { max: CHAT_MAX_REQUESTS, windowMs: CHAT_WINDOW_MS },
    now
  );
  if (!burst.allowed) return { ...burst, scope: "burst" };

  // Day-stamped keys reset at UTC midnight; the window just outlives the day.
  const day = now.toISOString().slice(0, 10);
  const daily = await hitLimits(
    db,
    [
      { key: hashKey(`chat-ip-day|${day}`, ip), rule: { max: chatIpDailyLimit(), windowMs: DAY_MS + 3_600_000 } },
      { key: `chat-global-day|${day}`, rule: { max: chatDailyLimit(), windowMs: DAY_MS + 3_600_000 } },
    ],
    now
  );
  if (!daily.allowed) {
    return { allowed: false, retryAfterSec: secondsToUtcMidnight(now), scope: "daily" };
  }
  return { allowed: true };
}
