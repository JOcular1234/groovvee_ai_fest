import { createHash, randomUUID } from "node:crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";

// Database-backed limiter shared by login, chat and public forms. Uses the
// login_throttles table as a generic keyed store (key/attempts/windowStart/
// lockedUntil), so it works across serverless instances with no extra
// service. Every hit is ONE atomic INSERT … ON CONFLICT DO UPDATE: the
// attempt is counted and the decision made in the same statement, so
// parallel requests can't slip past the limit between a check and a write.
//
// Semantics per key: up to `max` hits per `windowMs` are allowed. The hit
// that reaches `max` arms a lock — until `lockMs` from then (lockout mode),
// or until the window ends (plain fixed window). While locked every hit is
// refused and the window can't reset.

export type LimitRule = { max: number; windowMs: number; lockMs?: number };
export type LimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function hashKey(namespace: string, ...parts: string[]): string {
  return `${namespace}|${createHash("sha256").update(parts.join("|")).digest("hex")}`;
}

export async function hitLimit(
  db: PrismaClient,
  key: string,
  rule: LimitRule,
  now: Date = new Date()
): Promise<LimitResult> {
  const n = now.toISOString();
  const cutoff = new Date(now.getTime() - rule.windowMs).toISOString();
  const lockMs = rule.lockMs ?? null;

  // Timestamps are passed as ISO text and cast to timestamp (no tz) — the
  // offset is ignored, matching Prisma's UTC storage. The retry delay is
  // computed in SQL so no timestamp ever has to round-trip through JS.
  const rows = await db.$queryRaw<{ retry: number }[]>`
    INSERT INTO login_throttles AS t (id, key, attempts, "windowStart", "lockedUntil", "updatedAt")
    VALUES (${randomUUID()}, ${key}, 1, ${n}::timestamp, NULL, ${n}::timestamp)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE
        WHEN t."lockedUntil" > ${n}::timestamp THEN t.attempts + 1
        WHEN t."windowStart" <= ${cutoff}::timestamp THEN 1
        ELSE t.attempts + 1 END,
      "windowStart" = CASE
        WHEN (t."lockedUntil" IS NULL OR t."lockedUntil" <= ${n}::timestamp)
         AND t."windowStart" <= ${cutoff}::timestamp THEN ${n}::timestamp
        ELSE t."windowStart" END,
      "lockedUntil" = CASE
        WHEN t."lockedUntil" > ${n}::timestamp THEN t."lockedUntil"
        WHEN (CASE WHEN t."windowStart" <= ${cutoff}::timestamp THEN 1 ELSE t.attempts + 1 END) >= ${rule.max}
          THEN CASE
            WHEN ${lockMs}::double precision IS NOT NULL
              THEN ${n}::timestamp + ${lockMs}::double precision * interval '1 millisecond'
            ELSE (CASE WHEN t."windowStart" <= ${cutoff}::timestamp THEN ${n}::timestamp ELSE t."windowStart" END)
              + ${rule.windowMs}::double precision * interval '1 millisecond'
          END
        ELSE NULL END,
      "updatedAt" = ${n}::timestamp
    RETURNING CASE
      WHEN attempts > ${rule.max} AND "lockedUntil" > ${n}::timestamp
        THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("lockedUntil" - ${n}::timestamp))))::int
      ELSE 0 END AS retry`;

  // Opportunistic housekeeping — no cron needed for this table.
  if (Math.random() < 0.02) void pruneLimits(db, now).catch(() => {});

  const retry = rows[0]?.retry ?? 0;
  return retry > 0 ? { allowed: false, retryAfterSec: retry } : { allowed: true };
}

// Applies several rules; refuses with the longest wait if any is exceeded.
// Every rule is counted, so e.g. a refused login still uses up account and
// IP budget.
export async function hitLimits(
  db: PrismaClient,
  entries: { key: string; rule: LimitRule }[],
  now: Date = new Date()
): Promise<LimitResult> {
  const results = await Promise.all(
    entries.map((e) => hitLimit(db, e.key, e.rule, now))
  );
  const waits = results.flatMap((r) => (r.allowed ? [] : [r.retryAfterSec]));
  return waits.length
    ? { allowed: false, retryAfterSec: Math.max(...waits) }
    : { allowed: true };
}

export async function clearLimits(db: PrismaClient, keys: string[]) {
  await db.loginThrottle.deleteMany({ where: { key: { in: keys } } });
}

// Rows idle for a day and not currently locked carry no state worth keeping.
export async function pruneLimits(db: PrismaClient, now = new Date()) {
  const { count } = await db.loginThrottle.deleteMany({
    where: {
      updatedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
  });
  return count;
}
