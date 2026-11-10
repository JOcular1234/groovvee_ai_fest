import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const [admins, speakers, topics, agendaItems, ticketTypes, eventSettings] =
    await Promise.all([
      db.admin.count(),
      db.speaker.count(),
      db.topic.count(),
      db.agendaItem.count(),
      db.ticketType.count(),
      db.eventSettings.count(),
    ]);

  console.log("Connected. Row counts:", {
    admins,
    speakers,
    topics,
    agendaItems,
    ticketTypes,
    eventSettings,
  });

  await db.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("DB check failed:", err.message);
  process.exit(1);
});
