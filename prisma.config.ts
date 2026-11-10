import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI/migrations use DIRECT_URL (Neon unpooled) when set, else DATABASE_URL.
    // Runtime queries always use the pooled DATABASE_URL via lib/db.ts.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
