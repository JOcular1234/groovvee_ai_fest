import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createCompetition,
  createCompetitionRound,
  deleteCompetition,
  deleteCompetitionRound,
  getCompetitionById,
  listCompetitionsForAdmin,
  moveCompetitionRound,
  queryCompetitionBySlug,
  queryHackWarsCompetition,
  queryPublishedCompetitions,
  setCompetitionPublished,
  updateCompetition,
  updateCompetitionRound,
} from "../lib/competitions";
import { utcToZonedLocalInput } from "../lib/datetime";
import { SlugConflictError } from "../lib/slug";
import {
  competitionFormSchema,
  competitionRoundFormSchema,
} from "../lib/validation/competition";

// DB-level test suite for competition management.
// Creates rows prefixed with TEST_ and removes them all at the end.

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function compInput(overrides: Record<string, unknown> = {}) {
  const parsed = competitionFormSchema.safeParse({
    title: "TEST Competition",
    slug: "",
    kind: "CONTEST",
    status: "UPCOMING",
    description: "A test competition description.",
    startsAtLocal: "",
    endsAtLocal: "",
    timezone: "UTC",
    prizeText: "",
    rulesUrl: "",
    imageUrl: "",
    eventId: "",
    featured: false,
    published: false,
    sortOrder: 0,
    ...overrides,
  });
  if (!parsed.success) {
    throw new Error(
      `test fixture failed to parse: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }
  return parsed.data;
}

function roundInput(overrides: Record<string, unknown> = {}) {
  const parsed = competitionRoundFormSchema.safeParse({
    name: "TEST Round",
    description: "",
    startsAtLocal: "",
    endsAtLocal: "",
    sortOrder: 0,
    ...overrides,
  });
  if (!parsed.success) throw new Error("round fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  // Applications are Restrict — remove test applications first.
  const comps = await scriptDb.competition.findMany({
    where: { title: { startsWith: "TEST_" } },
    select: { id: true },
  });
  const ids = comps.map((c) => c.id);
  await scriptDb.competitionApplication.deleteMany({
    where: { competitionId: { in: ids } },
  });
  await scriptDb.competition.deleteMany({ where: { id: { in: ids } } });
};

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

async function main() {
  console.log("Warming up database…");
  await waitForDb();
  await cleanup();

  console.log("\n— Validation —");
  check(
    "rejects empty title",
    !competitionFormSchema.safeParse({ ...compInput(), title: "" }).success
  );
  check(
    "rejects bad kind",
    !competitionFormSchema.safeParse({ ...compInput(), kind: "LEAGUE" }).success
  );
  check(
    "rejects http rulesUrl",
    !competitionFormSchema.safeParse({
      ...compInput(),
      rulesUrl: "http://x.test/rules",
    }).success
  );
  check(
    "rejects end before start",
    !competitionFormSchema.safeParse({
      ...compInput(),
      startsAtLocal: "2026-06-02T10:00",
      endsAtLocal: "2026-06-01T10:00",
    }).success
  );
  check(
    "rejects bad timezone",
    !competitionFormSchema.safeParse({
      ...compInput(),
      timezone: "Not/AZone",
    }).success
  );

  console.log("\n— Slug & CRUD —");
  const c1 = await createCompetition(
    scriptDb,
    compInput({ title: "TEST_First Comp", published: true })
  );
  check("auto slug generated", c1.slug === "test-first-comp");

  const c2 = await createCompetition(
    scriptDb,
    compInput({ title: "TEST_First Comp" })
  );
  check("auto collision gets suffix", c2.slug === "test-first-comp-2");

  let dup = false;
  try {
    await createCompetition(
      scriptDb,
      compInput({ title: "TEST_Other", slug: c1.slug })
    );
  } catch (e) {
    dup = e instanceof SlugConflictError;
  }
  check("manual duplicate slug rejected", dup);

  const updated = await updateCompetition(scriptDb, c1.id, {
    ...compInput({
      title: "TEST_First Comp",
      prizeText: "$500",
      published: true,
    }),
    slug: c1.slug,
  });
  check(
    "update keeps slug, sets fields",
    updated?.slug === c1.slug && updated.prizeText === "$500"
  );
  check(
    "update of missing competition returns null",
    (await updateCompetition(scriptDb, "missing", compInput())) === null
  );

  console.log("\n— Timezone —");
  const c3 = await createCompetition(
    scriptDb,
    compInput({
      title: "TEST_TZ Comp",
      startsAtLocal: "2026-06-01T18:00",
      timezone: "Africa/Lagos",
      published: true,
    })
  );
  check(
    "18:00 Lagos stored as 17:00 UTC",
    c3.startsAt?.toISOString() === "2026-06-01T17:00:00.000Z",
    c3.startsAt?.toISOString()
  );
  check(
    "round-trips back to Lagos wall time",
    c3.startsAt !== null &&
      utcToZonedLocalInput(c3.startsAt, "Africa/Lagos") === "2026-06-01T18:00"
  );

  console.log("\n— Rounds —");
  const r1 = await createCompetitionRound(scriptDb, c3.id, roundInput({ name: "TEST_R1" }));
  check("round created", r1?.name === "TEST_R1");

  const r2 = await createCompetitionRound(
    scriptDb,
    c3.id,
    roundInput({ name: "TEST_R2", startsAtLocal: "2026-06-10T09:00" })
  );
  check(
    "round date uses competition timezone",
    r2?.startsAt?.toISOString() === "2026-06-10T08:00:00.000Z",
    r2?.startsAt?.toISOString()
  );

  const r1u = await updateCompetitionRound(scriptDb, r1!.id, roundInput({ name: "TEST_R1x" }));
  check("round renamed", r1u?.name === "TEST_R1x");

  check(
    "round move swaps order",
    await moveCompetitionRound(scriptDb, c3.id, r2!.id, -1)
  );
  const withRounds = await getCompetitionById(scriptDb, c3.id);
  check(
    "order persisted",
    withRounds?.rounds[0]?.id === r2!.id && withRounds?.rounds[1]?.id === r1!.id
  );

  check(
    "delete round works",
    await deleteCompetitionRound(scriptDb, r2!.id)
  );

  console.log("\n— Public visibility —");
  const publicList = await queryPublishedCompetitions(scriptDb);
  check(
    "public list shows published only",
    publicList.some((c) => c.id === c1.id) &&
      publicList.some((c) => c.id === c3.id) &&
      !publicList.some((c) => c.id === c2.id)
  );

  await setCompetitionPublished(scriptDb, c1.id, false);
  const afterUnpublish = await queryPublishedCompetitions(scriptDb);
  check(
    "unpublish hides competition publicly",
    !afterUnpublish.some((c) => c.id === c1.id)
  );

  const bySlug = await queryCompetitionBySlug(scriptDb, c3.slug);
  check(
    "slug page returns published comp with rounds",
    bySlug?.id === c3.id && bySlug.rounds.length === 1
  );
  check(
    "slug page excludes unpublished",
    (await queryCompetitionBySlug(scriptDb, c2.slug)) === null
  );

  check(
    "hack wars query finds seeded competition",
    (await queryHackWarsCompetition(scriptDb))?.kind === "HACK_WARS"
  );

  console.log("\n— Admin list & delete —");
  const search = await listCompetitionsForAdmin(scriptDb, { q: "TEST_" });
  check(
    "admin search by title",
    search.competitions.length >= 3 &&
      search.competitions.every((c) => c.title.startsWith("TEST_"))
  );

  // Restrict: a competition with an application cannot be deleted.
  await scriptDb.competitionApplication.create({
    data: {
      competitionId: c2.id,
      contactName: "Test Applicant",
      email: "test-applicant@example.test",
      phone: "+10000000000",
      school: "Test U",
      intro: "Test intro for the applicant.",
    },
  });
  check(
    "delete blocked by applications",
    (await deleteCompetition(scriptDb, c2.id)) === "has_entries"
  );
  await scriptDb.competitionApplication.deleteMany({
    where: { competitionId: c2.id },
  });
  check(
    "delete succeeds once clear",
    (await deleteCompetition(scriptDb, c2.id)) === "deleted"
  );

  await cleanup();
  await closeScriptDb();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

let attempt = 0;
async function run(): Promise<void> {
  try {
    await main();
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? "");
    if (TRANSIENT.has(code) && ++attempt <= 3) {
      console.log(`Transient ${code} — restarting suite (attempt ${attempt})`);
      return run();
    }
    console.error("Suite error:", err);
    await cleanup().catch(() => {});
    await closeScriptDb().catch(() => {});
    process.exit(1);
  }
}

run();
