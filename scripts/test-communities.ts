import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createCommunity,
  deleteCommunity,
  getCommunityById,
  listCommunitiesForAdmin,
  moveCommunity,
  queryCommunityBySlug,
  queryFeaturedCommunities,
  queryPublishedCommunities,
  setCommunityFeatured,
  setCommunityPublished,
  updateCommunity,
} from "../lib/communities";
import { SlugConflictError } from "../lib/slug";
import { communityFormSchema } from "../lib/validation/community";

// DB-level test suite for community management.
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

function communityInput(overrides: Record<string, unknown> = {}) {
  const parsed = communityFormSchema.safeParse({
    name: "TEST Community",
    slug: "",
    type: "INDUSTRY",
    description: "Test community description.",
    imageUrl: "",
    city: "",
    country: "",
    joinUrl: "",
    featured: false,
    published: false,
    sortOrder: 0,
    ...overrides,
  });
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.community.deleteMany({
    where: { name: { startsWith: "TEST_" } },
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

  console.log("\n— Validation —");
  check(
    "rejects empty name",
    !communityFormSchema.safeParse({ ...communityInput(), name: "" }).success
  );
  check(
    "rejects bad type",
    !communityFormSchema.safeParse({ ...communityInput(), type: "ROBOT" })
      .success
  );
  check(
    "rejects unsafe join URL",
    !communityFormSchema.safeParse({
      ...communityInput(),
      joinUrl: "javascript:alert(1)",
    }).success
  );
  check(
    "rejects unsafe image URL",
    !communityFormSchema.safeParse({
      ...communityInput(),
      imageUrl: "http://x.test/a.png",
    }).success
  );
  check(
    "accepts all four types",
    ["STUDENT_TRIBE", "CAMPUS", "CREATIVE", "INDUSTRY"].every(
      (t) => communityInput({ type: t }).type === t
    )
  );
  check(
    "rejects bad category",
    !communityFormSchema.safeParse({
      ...communityInput(),
      category: "ROBOTICS",
    }).success
  );
  check(
    "accepts a valid category",
    communityInput({ category: "HEALTHCARE" }).category === "HEALTHCARE"
  );
  check(
    "category defaults to null",
    communityInput().category === null
  );

  console.log("\n— Slug & CRUD —");
  const c1 = await createCommunity(
    scriptDb,
    communityInput({ name: "TEST_Lagos Builders", published: true })
  );
  check("auto slug generated", c1.slug === "test-lagos-builders");

  const c2 = await createCommunity(
    scriptDb,
    communityInput({ name: "TEST_Lagos Builders" })
  );
  check("auto collision gets suffix", c2.slug === "test-lagos-builders-2");

  let dup = false;
  try {
    await createCommunity(
      scriptDb,
      communityInput({ name: "TEST_Other", slug: c1.slug })
    );
  } catch (e) {
    dup = e instanceof SlugConflictError;
  }
  check("manual duplicate slug rejected", dup);

  const updated = await updateCommunity(scriptDb, c1.id, {
    ...communityInput({
      name: "TEST_Lagos Builders",
      city: "Lagos",
      country: "Nigeria",
      published: true, // keep c1 published for later public-visibility checks
    }),
    slug: c1.slug,
  });
  check(
    "update keeps slug, sets fields",
    updated?.slug === c1.slug && updated.city === "Lagos"
  );

  check(
    "update of missing community returns null",
    (await updateCommunity(scriptDb, "missing", communityInput())) === null
  );

  console.log("\n— Publish / feature / public —");
  const c3 = await createCommunity(
    scriptDb,
    communityInput({
      name: "TEST_Creative Crew",
      type: "CREATIVE",
      published: true,
      featured: true,
      joinUrl: "https://example.com/join",
    })
  );

  let publicList = await queryPublishedCommunities(scriptDb);
  check(
    "unpublished community hidden publicly",
    !publicList.some((c) => c.id === c2.id) &&
      publicList.some((c) => c.id === c1.id)
  );

  await setCommunityPublished(scriptDb, c2.id, true);
  publicList = await queryPublishedCommunities(scriptDb);
  check(
    "publish makes community public",
    publicList.some((c) => c.id === c2.id)
  );

  const featured = await queryFeaturedCommunities(scriptDb);
  check(
    "featured list = published AND featured",
    featured.some((c) => c.id === c3.id) &&
      !featured.some((c) => c.id === c1.id)
  );

  await setCommunityFeatured(scriptDb, c1.id, true);
  check(
    "feature toggle works",
    (await queryFeaturedCommunities(scriptDb)).some((c) => c.id === c1.id)
  );

  const bySlug = await queryCommunityBySlug(scriptDb, c3.slug);
  check(
    "slug page returns published community",
    bySlug?.id === c3.id && bySlug.joinUrl === "https://example.com/join"
  );

  const c4 = await createCommunity(
    scriptDb,
    communityInput({
      name: "TEST_Health Circle",
      type: "INDUSTRY",
      category: "HEALTHCARE",
      published: true,
    })
  );
  const filtered = await queryPublishedCommunities(scriptDb, {
    category: "HEALTHCARE",
  });
  check(
    "category filter returns matching communities",
    filtered.some((c) => c.id === c4.id) &&
      filtered.every((c) => c.category === "HEALTHCARE")
  );
  const unfiltered = await queryPublishedCommunities(scriptDb, {
    category: "LEGAL",
  });
  check(
    "other categories exclude the community",
    !unfiltered.some((c) => c.id === c4.id)
  );
  check(
    "slug page excludes unpublished",
    (await queryCommunityBySlug(scriptDb, "never-published")) === null
  );

  console.log("\n— Ordering, search, delete —");
  const adminOrder = async () =>
    (
      await scriptDb.community.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((c) => c.id);
  const ordered = await adminOrder();
  const idx = ordered.indexOf(c3.id);
  const neighbor = ordered[idx - 1];
  check("moveCommunity swaps", await moveCommunity(scriptDb, c3.id, -1));
  const after = await adminOrder();
  check(
    "order changed correctly",
    after[idx - 1] === c3.id && after[idx] === neighbor
  );

  const search = await listCommunitiesForAdmin(scriptDb, {
    q: "TEST_Creative",
  });
  check(
    "admin search by name",
    search.communities.length === 1 && search.communities[0].id === c3.id
  );
  const citySearch = await listCommunitiesForAdmin(scriptDb, { q: "Lagos" });
  check(
    "admin search by city",
    citySearch.communities.some((c) => c.id === c1.id)
  );

  // Events linked to a community must survive its deletion (SetNull).
  const ev = await scriptDb.event.create({
    data: {
      title: "TEST_Event",
      slug: "test-event",
      description: "test",
      startsAt: new Date("2030-01-01T10:00:00Z"),
      communityId: c1.id,
    },
  });
  check("deleteCommunity returns true", await deleteCommunity(scriptDb, c1.id));
  const evAfter = await scriptDb.event.findUnique({ where: { id: ev.id } });
  check(
    "deleting community keeps event, clears link",
    !!evAfter && evAfter.communityId === null
  );
  await scriptDb.event.delete({ where: { id: ev.id } });

  check(
    "deleted community gone",
    (await getCommunityById(scriptDb, c1.id)) === null
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
