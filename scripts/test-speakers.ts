import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createSpeaker,
  deleteSpeaker,
  getSpeakerById,
  listSpeakersForAdmin,
  moveSpeaker,
  queryFeaturedSpeakers,
  queryPublishedSpeakers,
  setSpeakerFeatured,
  setSpeakerPublished,
  updateSpeaker,
} from "../lib/speakers";
import { speakerInputSchema } from "../lib/validation/speaker";

// DB-level test suite for Stage 2.3 speaker management.
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

function speakerInput(overrides: Record<string, unknown> = {}) {
  const parsed = speakerInputSchema.safeParse({
    name: "TEST Speaker",
    title: "Test Title",
    organization: "TEST Org",
    bio: "Test bio.",
    imageUrl: "",
    socials: [],
    featured: false,
    published: false,
    sortOrder: 0,
    ...overrides,
  });
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

async function main() {
  console.log("Warming up database…");
  await waitForDb();

  const cleanup = async () => {
    await scriptDb.speaker.deleteMany({
      where: { name: { startsWith: "TEST_" } },
    });
    await scriptDb.agendaItem.deleteMany({
      where: { title: { startsWith: "TEST_" } },
    });
  };

  await cleanup(); // remove leftovers from earlier aborted runs

  console.log("\n— Validation —");
  check(
    "rejects empty name",
    !speakerInputSchema.safeParse({ ...speakerInput(), name: "" }).success
  );
  check(
    "rejects javascript: image URL",
    !speakerInputSchema.safeParse({
      ...speakerInput(),
      imageUrl: "javascript:alert(1)",
    }).success
  );
  check(
    "rejects http (non-TLS) image URL",
    !speakerInputSchema.safeParse({
      ...speakerInput(),
      imageUrl: "http://example.com/x.png",
    }).success
  );
  check(
    "accepts https + local image paths",
    speakerInputSchema.safeParse({
      ...speakerInput(),
      imageUrl: "https://cdn.example.com/x.png",
    }).success &&
      speakerInputSchema.safeParse({
        ...speakerInput(),
        imageUrl: "/images/x.png",
      }).success
  );
  check(
    "rejects non-https social link",
    !speakerInputSchema.safeParse({
      ...speakerInput(),
      socials: [{ label: "X", url: "ftp://evil.example" }],
    }).success
  );
  check(
    "rejects name over 120 chars",
    !speakerInputSchema.safeParse({
      ...speakerInput(),
      name: "x".repeat(121),
    }).success
  );

  console.log("\n— CRUD —");
  const s1 = await createSpeaker(
    scriptDb,
    speakerInput({ name: "TEST_Alpha", sortOrder: 1 })
  );
  check("creates a speaker", !!s1.id && s1.name === "TEST_Alpha");

  const fetched = await getSpeakerById(scriptDb, s1.id);
  check("retrieves a speaker", fetched?.id === s1.id);

  const updated = await updateSpeaker(
    scriptDb,
    s1.id,
    speakerInput({ name: "TEST_Alpha", title: "Updated Title", bio: "New bio" })
  );
  check(
    "updates a speaker",
    updated?.title === "Updated Title" && updated.bio === "New bio"
  );

  check(
    "update of missing speaker returns null",
    (await updateSpeaker(scriptDb, "missing-id", speakerInput())) === null
  );

  console.log("\n— Publish / feature —");
  const s2 = await createSpeaker(
    scriptDb,
    speakerInput({ name: "TEST_Beta", sortOrder: 2, published: true })
  );
  const s3 = await createSpeaker(
    scriptDb,
    speakerInput({
      name: "TEST_Gamma",
      sortOrder: 3,
      published: true,
      featured: true,
    })
  );

  let publicList = await queryPublishedSpeakers(scriptDb);
  check(
    "unpublished speaker hidden from public list",
    !publicList.some((s) => s.id === s1.id) &&
      publicList.some((s) => s.id === s2.id)
  );

  await setSpeakerPublished(scriptDb, s1.id, true);
  publicList = await queryPublishedSpeakers(scriptDb);
  check("publish makes speaker public", publicList.some((s) => s.id === s1.id));

  let featured = await queryFeaturedSpeakers(scriptDb);
  check(
    "featured list = published AND featured only",
    featured.some((s) => s.id === s3.id) && !featured.some((s) => s.id === s2.id)
  );

  await setSpeakerFeatured(scriptDb, s2.id, true);
  featured = await queryFeaturedSpeakers(scriptDb);
  check(
    "feature toggle adds to homepage list",
    featured.some((s) => s.id === s2.id)
  );

  await setSpeakerPublished(scriptDb, s3.id, false);
  featured = await queryFeaturedSpeakers(scriptDb);
  check(
    "unpublishing removes featured speaker publicly",
    !featured.some((s) => s.id === s3.id)
  );

  console.log("\n— Ordering —");
  const ordered = (await queryPublishedSpeakers(scriptDb)).filter((s) =>
    s.name.startsWith("TEST_")
  );
  check(
    "public list ordered by sortOrder",
    ordered.findIndex((s) => s.id === s1.id) <
      ordered.findIndex((s) => s.id === s2.id)
  );

  // moveSpeaker operates on the global admin ordering (drafts included), so
  // assert the swap semantics against that ordering — s2's upward neighbour
  // may be a non-test or unpublished speaker invisible in the public list.
  const adminIds = async () =>
    (
      await scriptDb.speaker.findMany({
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
        select: { id: true },
      })
    ).map((s) => s.id);
  const before = await adminIds();
  const s2Index = before.indexOf(s2.id);
  const neighborId = before[s2Index - 1];
  check(
    "moveSpeaker swaps neighbours",
    await moveSpeaker(scriptDb, s2.id, -1)
  );
  const afterMove = await adminIds();
  check(
    "order actually changed (swapped with predecessor)",
    afterMove[s2Index - 1] === s2.id && afterMove[s2Index] === neighborId
  );
  check(
    "move beyond bounds rejected",
    !(await moveSpeaker(scriptDb, afterMove[0], -1))
  );

  console.log("\n— Search & list —");
  const search = await listSpeakersForAdmin(scriptDb, { q: "TEST_Alpha" });
  check(
    "admin search matches name",
    search.speakers.length === 1 && search.speakers[0].id === s1.id
  );
  const orgSearch = await listSpeakersForAdmin(scriptDb, { q: "TEST Org" });
  check("admin search matches organization", orgSearch.speakers.length >= 3);

  console.log("\n— Deletion & agenda integrity —");
  const agenda = await scriptDb.agendaItem.create({
    data: {
      title: "TEST_Session",
      description: "test",
      startsAt: new Date("2030-01-01T10:00:00Z"),
      endsAt: new Date("2030-01-01T11:00:00Z"),
      speakers: { connect: { id: s1.id } },
    },
    include: { speakers: true },
  });
  check(
    "agenda item linked to speaker",
    agenda.speakers.some((s) => s.id === s1.id)
  );

  check("deleteSpeaker returns true", await deleteSpeaker(scriptDb, s1.id));
  const agendaAfter = await scriptDb.agendaItem.findUnique({
    where: { id: agenda.id },
    include: { speakers: true },
  });
  check(
    "deleting speaker keeps agenda item, clears link",
    !!agendaAfter && agendaAfter.speakers.length === 0
  );
  check(
    "deleted speaker gone",
    (await getSpeakerById(scriptDb, s1.id)) === null
  );
  check(
    "delete of missing speaker returns false",
    !(await deleteSpeaker(scriptDb, s1.id))
  );

  await cleanup();
  await closeScriptDb();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

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
    await scriptDb.speaker
      .deleteMany({ where: { name: { startsWith: "TEST_" } } })
      .catch(() => {});
    await scriptDb.agendaItem
      .deleteMany({ where: { title: { startsWith: "TEST_" } } })
      .catch(() => {});
    await closeScriptDb().catch(() => {});
    process.exit(1);
  }
}

run();
