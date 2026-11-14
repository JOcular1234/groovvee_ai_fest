import { spawnSync } from "node:child_process";

import { assertSafeTestDatabase } from "./test-db";

// Applies all Prisma migrations to the test database. The guard runs first
// and rewrites DATABASE_URL/DIRECT_URL to the test URLs; prisma.config.ts
// loads .env via dotenv, which never overrides variables already set, so
// the child process can only reach the test database.
assertSafeTestDatabase();

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
