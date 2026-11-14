import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";

// Database client for scripts/test-*.ts. Tests create and delete rows, so
// they must never touch the app's real database: they connect only to
// TEST_DATABASE_URL and refuse to start when it is missing or points at the
// same database as DATABASE_URL / DIRECT_URL.
// Prepare the test database once with: npm run test:db:migrate

// Identity of a Postgres database: host (Neon "-pooler" suffix stripped, so
// pooled and direct URLs of the same endpoint compare equal) + port + name.
function dbIdentity(url: string): string {
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace("-pooler.", ".");
  return `${host}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
}

export function assertSafeTestDatabase(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  const refuse = (why: string): never => {
    console.error(`Refusing to run tests: ${why}`);
    process.exit(1);
  };

  if (process.env.NODE_ENV === "production") {
    refuse("NODE_ENV is production.");
  }
  if (!testUrl) {
    refuse(
      "TEST_DATABASE_URL is not set. Point it at a separate database " +
        "(e.g. a Neon branch), then run `npm run test:db:migrate`."
    );
  }
  let testId = "";
  try {
    testId = dbIdentity(testUrl!);
  } catch {
    refuse("TEST_DATABASE_URL is not a valid connection URL.");
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const other = process.env[name];
    if (!other) continue;
    try {
      if (dbIdentity(other) === testId) {
        refuse(`TEST_DATABASE_URL points at the same database as ${name}.`);
      }
    } catch {
      // Unparseable app URL can't be the same database as a valid test URL.
    }
  }

  // Anything that later reads DATABASE_URL in this process sees the test DB.
  process.env.DATABASE_URL = testUrl!;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL ?? testUrl!;
  return testUrl!;
}

const testUrl = assertSafeTestDatabase();

// Neon free-tier computes autosuspend — the first connection after idle can
// take ~10s to wake, so keepalive + a generous connect timeout help.
export const scriptPool = new Pool({
  connectionString: testUrl,
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
