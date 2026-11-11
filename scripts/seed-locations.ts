import { LAUNCH_LOCATIONS } from "../data/locations";
import {
  backfillEventLocations,
  locationLabel,
  locationSlug,
  upsertLocationSeed,
} from "../lib/locations";
import { locationSeedSchema } from "../lib/validation/location";
import { closeScriptDb, scriptDb, waitForDb } from "./prisma";

// Idempotent seed: upserts launch locations by deterministic slug, then
// backfills unlinked events whose city+country match a known city location.
// Safe to re-run — no duplicates, no unrelated data touched.
async function main() {
  await waitForDb();

  let created = 0;
  let updated = 0;
  for (const raw of LAUNCH_LOCATIONS) {
    const seed = locationSeedSchema.parse(raw);
    const slug = locationSlug(seed);
    const existing = await scriptDb.location.findUnique({
      where: { slug },
      select: { id: true },
    });
    await upsertLocationSeed(scriptDb, seed);
    if (existing) updated++;
    else created++;
    console.log(`  ${existing ? "update" : "create"}  ${slug}  (${locationLabel(seed)})`);
  }
  console.log(
    `Locations: ${created} created, ${updated} updated — ${LAUNCH_LOCATIONS.length} seeded`
  );

  const linked = await backfillEventLocations(scriptDb);
  for (const m of linked) {
    console.log(`  linked  event ${m.id} → ${m.location}`);
  }
  console.log(`Backfill: ${linked.length} event(s) linked to locations`);

  await closeScriptDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeScriptDb().catch(() => {});
  process.exit(1);
});
