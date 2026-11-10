import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Shared client for local scripts (provisioning, checks, tests).
// Neon free-tier computes autosuspend — the first connection after idle can
// take ~10s to wake, so keepalive + a generous connect timeout help.
export const scriptPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  connectionTimeoutMillis: 30_000,
});
export const scriptDb = new PrismaClient({
  adapter: new PrismaPg(scriptPool),
});

// Retry a trivial query until the compute is awake.
export async function waitForDb(attempts = 10): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await scriptDb.$queryRaw`SELECT 1`;
      return;
    } catch {
      if (i === attempts) throw new Error("Database unreachable after retries");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function closeScriptDb() {
  await scriptDb.$disconnect();
  await scriptPool.end();
}
