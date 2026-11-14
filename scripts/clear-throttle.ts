import "dotenv/config";

import { scriptDb, scriptPool, waitForDb } from "./prisma";

// Clears rate-limit/lockout rows from login_throttles — the shared store for
// login, chat and public-form limits. Dev convenience: use after your own
// testing trips a "Too many attempts" lockout. Do NOT run against a
// production database — it lifts brute-force protection until the limits
// re-arm.
//
//   npx tsx scripts/clear-throttle.ts            clear everything
//   npx tsx scripts/clear-throttle.ts login      only keys starting with "login|"

const prefix = process.argv[2];

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to clear throttles in production.");
  process.exit(1);
}

async function main() {
  await waitForDb();
  const { count } = await scriptDb.loginThrottle.deleteMany({
    where: prefix ? { key: { startsWith: `${prefix}|` } } : {},
  });
  console.log(`Cleared ${count} throttle row(s).`);
}

main()
  .catch((err) => {
    console.error("Failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await scriptDb.$disconnect();
    await scriptPool.end();
  });
