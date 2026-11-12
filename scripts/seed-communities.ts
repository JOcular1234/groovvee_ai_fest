import { LAUNCH_COMMUNITIES } from "../data/communities";
import { slugify } from "../lib/slug";
import { communityInputSchema } from "../lib/validation/community";
import { closeScriptDb, scriptDb, waitForDb } from "./prisma";

// Idempotent seed: upserts the launch creative/industry communities by
// deterministic slug. Safe to re-run — updates the same rows, never creates
// duplicates or touches communities outside the launch list.
async function main() {
  await waitForDb();

  let created = 0;
  let updated = 0;
  for (const [i, raw] of LAUNCH_COMMUNITIES.entries()) {
    const seed = communityInputSchema.parse({
      imageUrl: "",
      city: "",
      country: "",
      joinUrl: "",
      featured: false,
      published: true,
      sortOrder: i,
      ...raw,
      slug: slugify(raw.name),
    });
    const existing = await scriptDb.community.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });
    await scriptDb.community.upsert({
      where: { slug: seed.slug },
      create: seed,
      update: seed,
    });
    if (existing) updated++;
    else created++;
    console.log(`  ${existing ? "update" : "create"}  ${seed.slug}  (${seed.name})`);
  }
  console.log(
    `Communities: ${created} created, ${updated} updated — ${LAUNCH_COMMUNITIES.length} seeded`
  );

  await closeScriptDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeScriptDb().catch(() => {});
  process.exit(1);
});
