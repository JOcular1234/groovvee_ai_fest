import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createTopic,
  deleteTopic,
  getTopicById,
  listTopicsForAdmin,
  moveTopic,
  queryHomepageTopics,
  queryPublishedTopics,
  setTopicPublished,
  slugify,
  SlugConflictError,
  updateTopic,
} from "../lib/topics";
import { topicFormSchema } from "../lib/validation/topic";

// DB-level test suite for Stage 2.4 topic management.
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

function topicInput(overrides: Record<string, unknown> = {}) {
  const parsed = topicFormSchema.safeParse({
    title: "TEST Topic",
    slug: "",
    description: "Test description for the topic.",
    imageUrl: "",
    published: false,
    sortOrder: 0,
    ...overrides,
  });
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.topic.deleteMany({
    where: { title: { startsWith: "TEST_" } },
  });
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

  console.log("\n— Slugify —");
  check("slugifies basic title", slugify("Generative AI") === "generative-ai");
  check(
    "slugifies punctuation + case",
    slugify("  AI & ML: The Future!! ") === "ai-ml-the-future"
  );
  check(
    "slugifies unicode",
    slugify("Créativité & Données") === "creativite-donnees"
  );

  console.log("\n— Validation —");
  check(
    "rejects empty title",
    !topicFormSchema.safeParse({ ...topicInput(), title: "" }).success
  );
  check(
    "rejects missing description",
    !topicFormSchema.safeParse({ ...topicInput(), description: "" }).success
  );
  check(
    "rejects invalid slug chars",
    !topicFormSchema.safeParse({ ...topicInput(), slug: "Bad Slug!" }).success
  );
  check(
    "rejects unsafe image URL",
    !topicFormSchema.safeParse({
      ...topicInput(),
      imageUrl: "javascript:alert(1)",
    }).success
  );
  check(
    "rejects negative sortOrder",
    !topicFormSchema.safeParse({ ...topicInput(), sortOrder: -1 }).success
  );

  console.log("\n— Slug generation & uniqueness —");
  const t1 = await createTopic(
    scriptDb,
    topicInput({ title: "TEST_Slug Base", published: true })
  );
  check("auto slug generated", t1.slug === "test-slug-base");

  const t2 = await createTopic(
    scriptDb,
    topicInput({ title: "TEST_Slug Base" })
  );
  check(
    "auto collision gets suffix",
    t2.slug === "test-slug-base-2" && t2.slug !== t1.slug
  );

  let manualDup = false;
  try {
    await createTopic(
      scriptDb,
      topicInput({ title: "TEST_Other", slug: t1.slug })
    );
  } catch (e) {
    manualDup = e instanceof SlugConflictError;
  }
  check("manual duplicate slug rejected", manualDup);

  // Concurrent auto-slug creation — DB unique constraint must hold.
  const [r1, r2] = await Promise.allSettled([
    createTopic(scriptDb, topicInput({ title: "TEST_Race" })),
    createTopic(scriptDb, topicInput({ title: "TEST_Race" })),
  ]);
  const raceOk =
    r1.status === "fulfilled" &&
    r2.status === "fulfilled" &&
    r1.value.slug !== r2.value.slug;
  const raceRows = await scriptDb.topic.count({
    where: { slug: { startsWith: "test-race" } },
  });
  check(
    "concurrent same-slug creation produces unique slugs",
    raceOk && raceRows === 2,
    `r1=${r1.status === "fulfilled" ? r1.value.slug : "rejected"}, r2=${
      r2.status === "fulfilled" ? r2.value.slug : "rejected"
    }`
  );

  console.log("\n— CRUD —");
  const fetched = await getTopicById(scriptDb, t1.id);
  check("retrieves a topic", fetched?.id === t1.id);

  const updated = await updateTopic(scriptDb, t1.id, {
    ...topicInput({ title: "TEST_Slug Base", description: "Updated desc text." }),
    slug: "test-renamed",
  });
  check(
    "update changes slug + fields",
    updated?.slug === "test-renamed" &&
      updated.description === "Updated desc text."
  );

  let selfDup = false;
  try {
    await updateTopic(scriptDb, t2.id, {
      ...topicInput({ title: "TEST_Slug Base" }),
      slug: "test-renamed", // t1's slug — must fail
    });
  } catch (e) {
    selfDup = e instanceof SlugConflictError;
  }
  check("update to another topic's slug rejected", selfDup);

  const sameSlug = await updateTopic(scriptDb, t2.id, {
    ...topicInput({ title: "TEST_Slug Base" }),
    slug: t2.slug, // own slug excluded from uniqueness check
  });
  check("keeping own slug allowed", sameSlug?.slug === t2.slug);

  check(
    "update of missing topic returns null",
    (await updateTopic(scriptDb, "missing-id", topicInput())) === null
  );

  console.log("\n— Publish & public visibility —");
  const t3 = await createTopic(
    scriptDb,
    topicInput({ title: "TEST_Published", published: true, sortOrder: 1 })
  );
  let publicList = await queryPublishedTopics(scriptDb);
  check(
    "unpublished topic hidden publicly",
    !publicList.some((t) => t.id === t2.id) &&
      publicList.some((t) => t.id === t3.id)
  );

  await setTopicPublished(scriptDb, t2.id, true);
  publicList = await queryPublishedTopics(scriptDb);
  check("publish makes topic public", publicList.some((t) => t.id === t2.id));

  const home = await queryHomepageTopics(scriptDb);
  check(
    "homepage preview = published only",
    home.every((t) => publicList.some((p) => p.id === t.id)) &&
      home.some((t) => t.id === t3.id)
  );

  console.log("\n— Ordering —");
  // moveTopic uses the canonical admin ordering (sortOrder, createdAt, id).
  const adminOrder = async () =>
    (
      await scriptDb.topic.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((t) => t.id);
  const ordered = await adminOrder();
  const idx = ordered.indexOf(t2.id);
  const neighbor = ordered[idx - 1];
  check(
    "moveTopic swaps with predecessor",
    await moveTopic(scriptDb, t2.id, -1)
  );
  const after = await adminOrder();
  check(
    "order changed correctly",
    after[idx - 1] === t2.id && after[idx] === neighbor
  );

  console.log("\n— Search & delete —");
  const search = await listTopicsForAdmin(scriptDb, { q: "TEST_Published" });
  check(
    "admin search by title",
    search.topics.length === 1 && search.topics[0].id === t3.id
  );

  check("deleteTopic returns true", await deleteTopic(scriptDb, t3.id));
  check(
    "deleted topic gone",
    (await getTopicById(scriptDb, t3.id)) === null
  );
  check(
    "delete of missing topic returns false",
    !(await deleteTopic(scriptDb, t3.id))
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
