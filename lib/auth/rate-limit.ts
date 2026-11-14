import { createHash } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";

import { clearLimits, hashKey, hitLimits, type LimitResult } from "@/lib/rate-limit";

// Login throttling with three independent counters, all consumed atomically
// BEFORE the password is checked (so parallel guesses can't race past them):
//   pair    — one email from one IP: 5 tries / 15 min, then 15 min lock
//   account — one email from anywhere: 20 tries / 15 min (distributed
//             guessing); kept above the pair limit so a single attacker IP
//             can't lock the real admin out on its own
//   ip      — one IP across all emails: 30 tries / 15 min (password spraying)
// A successful login clears the pair and account counters; the IP counter
// keeps running so one valid account can't be used to reset spraying.
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_ACCOUNT_MAX_ATTEMPTS = 20;
export const LOGIN_IP_MAX_ATTEMPTS = 30;

// Pair key format predates the shared limiter — kept so existing rows apply.
export function throttleKey(email: string, ip: string): string {
  return createHash("sha256").update(`${email}|${ip}`).digest("hex");
}

export function loginThrottleKeys(email: string, ip: string) {
  return {
    pair: throttleKey(email, ip),
    account: hashKey("login-acct", email),
    ip: hashKey("login-ip", ip),
  };
}

export type ThrottleStatus = LimitResult;

export function consumeLoginAttempt(
  db: PrismaClient,
  email: string,
  ip: string
): Promise<ThrottleStatus> {
  const k = loginThrottleKeys(email, ip);
  const lock = { windowMs: LOGIN_WINDOW_MS, lockMs: LOGIN_LOCK_MS };
  return hitLimits(db, [
    { key: k.pair, rule: { max: LOGIN_MAX_ATTEMPTS, ...lock } },
    { key: k.account, rule: { max: LOGIN_ACCOUNT_MAX_ATTEMPTS, ...lock } },
    { key: k.ip, rule: { max: LOGIN_IP_MAX_ATTEMPTS, ...lock } },
  ]);
}

export async function clearLoginThrottle(
  db: PrismaClient,
  email: string,
  ip: string
): Promise<void> {
  const k = loginThrottleKeys(email, ip);
  await clearLimits(db, [k.pair, k.account]).catch(() => {});
}
