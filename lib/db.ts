import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    max: 10,
    keepAlive: true,
    connectionTimeoutMillis: 30_000, // Neon compute wake-up can take ~10s
    idleTimeoutMillis: 10_000, // drop idle clients before the pooler does
  });
pool.on("error", () => {}); // idle-client socket errors are retried at query level
const adapter = new PrismaPg(pool);

export const db = globalForDb.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = db;
  globalForDb.pgPool = pool;
}

// Neon free-tier connections drop intermittently (autosuspend, pooler churn).
// Retry transient failures — socket errnos and Prisma connection codes —
// never retry real query errors.
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
  "P1001", // can't reach the database server
  "P1002", // database server reachable but timed out
  "P1017", // server closed the connection (idle pooler drop)
  "P2024", // timed out fetching a connection from the pool
]);

function transientCode(err: unknown): string | null {
  const code = (err as { code?: unknown })?.code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return code;
  if (err instanceof AggregateError) {
    for (const e of err.errors) {
      const found = transientCode(e);
      if (found) return found;
    }
  }
  return null;
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries = 6
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!transientCode(err) || attempt >= retries - 1) throw err;
      // Neon autosuspend can take ~10s to wake — budget ~15s of backoff.
      await new Promise((r) =>
        setTimeout(r, Math.min(250 * 2 ** attempt, 5000))
      );
    }
  }
}
