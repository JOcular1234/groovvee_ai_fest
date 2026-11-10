import { closeScriptDb, scriptDb, waitForDb } from "./prisma";

// Dev seed: ensures a REGISTRATION_OPEN HACK_WARS competition exists so the
// public apply flow can be exercised. Safe to re-run — updates in place.
async function main() {
  await waitForDb();
  const existing = await scriptDb.competition.findFirst({
    where: { kind: "HACK_WARS" },
  });
  if (existing) {
    await scriptDb.competition.update({
      where: { id: existing.id },
      data: { status: "REGISTRATION_OPEN", published: true },
    });
    console.log("Updated existing competition:", existing.title, existing.id);
  } else {
    const c = await scriptDb.competition.create({
      data: {
        title: "AI Hack Wars",
        slug: "ai-hack-wars",
        kind: "HACK_WARS",
        description:
          "The flagship GrooVVee build competition — solo or in teams of up to three.",
        status: "REGISTRATION_OPEN",
        published: true,
        featured: true,
      },
    });
    console.log("Created competition:", c.title, c.id);
  }
  await closeScriptDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeScriptDb().catch(() => {});
  process.exit(1);
});
