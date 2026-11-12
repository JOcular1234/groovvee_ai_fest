import { closeScriptDb, scriptDb, waitForDb } from "./prisma";

// Idempotent seed: upserts the launch events by slug. Safe to re-run —
// updates the same rows, never creates duplicates.
const EVENTS = [
  {
    title: "AI College All Campus Party",
    slug: "ai-college-all-campus-party-2026",
    description:
      "All-campus AI party — students, builders and the AI-curious under one roof for a night of demos, music and community at Coco's in downtown Minneapolis.",
    startsAt: new Date("2026-12-04T18:00:00-06:00"), // 6pm CST
    endsAt: new Date("2026-12-04T23:00:00-06:00"),
    timezone: "America/Chicago",
    city: "Minneapolis",
    stateProvince: "Minnesota",
    country: "United States",
    region: "North America",
    venueName: "Coco's Downtown Minneapolis",
    locationName: "Minneapolis",
    featured: true,
  },
  {
    title: "AI Vibe Code Party — Holiday Edition",
    slug: "ai-vibe-code-party-holiday-2026",
    description:
      "The holiday edition of the AI Vibe Code Party — an evening of live coding, demos and festive community energy.",
    startsAt: new Date("2026-12-18T18:00:00-06:00"),
    endsAt: new Date("2026-12-18T23:00:00-06:00"),
    timezone: "America/Chicago",
    city: "Minneapolis",
    stateProvince: "Minnesota",
    country: "United States",
    region: "North America",
    venueName: null,
    locationName: "Minneapolis",
    featured: false,
  },
];

async function main() {
  await waitForDb();

  for (const e of EVENTS) {
    const { locationName, ...data } = e;
    const location = locationName
      ? await scriptDb.location.findFirst({
          where: { name: locationName, type: "CITY" },
          select: { id: true },
        })
      : null;
    const existing = await scriptDb.event.findUnique({
      where: { slug: e.slug },
      select: { id: true },
    });
    await scriptDb.event.upsert({
      where: { slug: e.slug },
      create: { ...data, locationId: location?.id ?? null, published: true },
      update: { ...data, locationId: location?.id ?? null },
    });
    console.log(`  ${existing ? "update" : "create"}  ${e.slug}`);
  }
  console.log(`Events: ${EVENTS.length} seeded`);

  await closeScriptDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeScriptDb().catch(() => {});
  process.exit(1);
});
