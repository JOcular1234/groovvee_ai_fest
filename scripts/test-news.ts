import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createNewsPost,
  deleteNewsPost,
  getNewsPostById,
  listNewsPostsForAdmin,
  queryLatestNewsPosts,
  queryNewsPostBySlug,
  queryPublishedNewsPosts,
  setNewsPostPublished,
  updateNewsPost,
} from "../lib/news";
import { SlugConflictError } from "../lib/slug";
import { newsPostFormSchema } from "../lib/validation/news";

// DB-level test suite for news post management.
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

function postInput(overrides: Record<string, unknown> = {}) {
  const parsed = newsPostFormSchema.safeParse({
    title: "TEST Post",
    slug: "",
    excerpt: "A short test excerpt for the post.",
    body: "The full body of the test post.\n\nSecond paragraph.",
    coverImageUrl: "",
    sourceUrl: "",
    authorName: "",
    published: false,
    ...overrides,
  });
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.newsPost.deleteMany({
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

  console.log("\n— Validation —");
  check(
    "rejects empty title",
    !newsPostFormSchema.safeParse({ ...postInput(), title: "" }).success
  );
  check(
    "rejects oversized excerpt",
    !newsPostFormSchema.safeParse({
      ...postInput(),
      excerpt: "x".repeat(501),
    }).success
  );
  check(
    "rejects unsafe cover image URL",
    !newsPostFormSchema.safeParse({
      ...postInput(),
      coverImageUrl: "http://x.test/a.png",
    }).success
  );
  check(
    "rejects unsafe source URL",
    !newsPostFormSchema.safeParse({
      ...postInput(),
      sourceUrl: "javascript:alert(1)",
    }).success
  );

  console.log("\n— Slug & CRUD —");
  const p1 = await createNewsPost(
    scriptDb,
    postInput({ title: "TEST_First Post", published: true })
  );
  check("auto slug generated", p1.slug === "test-first-post");
  check("publishing stamps publishedAt", p1.publishedAt instanceof Date);

  const p2 = await createNewsPost(
    scriptDb,
    postInput({ title: "TEST_First Post" })
  );
  check("auto collision gets suffix", p2.slug === "test-first-post-2");
  check("draft has no publishedAt", p2.publishedAt === null);

  let dup = false;
  try {
    await createNewsPost(
      scriptDb,
      postInput({ title: "TEST_Other", slug: p1.slug })
    );
  } catch (e) {
    dup = e instanceof SlugConflictError;
  }
  check("manual duplicate slug rejected", dup);

  const updated = await updateNewsPost(scriptDb, p1.id, {
    ...postInput({ title: "TEST_First Post", authorName: "Test Author", published: true }),
    slug: p1.slug,
  });
  check(
    "update keeps slug, sets fields",
    updated?.slug === p1.slug && updated.authorName === "Test Author"
  );

  check(
    "update of missing post returns null",
    (await updateNewsPost(scriptDb, "missing", postInput())) === null
  );

  console.log("\n— Publish & public visibility —");
  await setNewsPostPublished(scriptDb, p2.id, true);
  const p2After = await getNewsPostById(scriptDb, p2.id);
  check("publish stamps publishedAt", p2After?.publishedAt instanceof Date);

  const publicList = await queryPublishedNewsPosts(scriptDb, 1);
  check(
    "public list only shows published",
    publicList.posts.some((p) => p.id === p1.id) &&
      publicList.posts.some((p) => p.id === p2.id)
  );

  await setNewsPostPublished(scriptDb, p2.id, false);
  const afterUnpublish = await queryPublishedNewsPosts(scriptDb, 1);
  check(
    "unpublish hides post publicly",
    !afterUnpublish.posts.some((p) => p.id === p2.id)
  );

  const p2b = await getNewsPostById(scriptDb, p2.id);
  check(
    "re-publish keeps original publishedAt",
    (await setNewsPostPublished(scriptDb, p2.id, true))?.publishedAt?.getTime() ===
      p2b?.publishedAt?.getTime()
  );

  const bySlug = await queryNewsPostBySlug(scriptDb, p1.slug);
  check(
    "slug page returns published post with body",
    bySlug?.id === p1.id && bySlug.body.includes("Second paragraph")
  );
  check(
    "slug page excludes unpublished",
    (await queryNewsPostBySlug(scriptDb, p2.slug + "-nope")) === null
  );

  await setNewsPostPublished(scriptDb, p2.id, false);
  const latest = await queryLatestNewsPosts(scriptDb, p1.id);
  check(
    "latest posts excludes current and drafts",
    !latest.some((p) => p.id === p1.id) && !latest.some((p) => p.id === p2.id)
  );

  console.log("\n— Admin list & delete —");
  const search = await listNewsPostsForAdmin(scriptDb, { q: "TEST_First" });
  check(
    "admin search by title",
    search.posts.length === 2 &&
      search.posts.every((p) => p.title.startsWith("TEST_"))
  );

  check("deleteNewsPost returns true", await deleteNewsPost(scriptDb, p2.id));
  check(
    "deleted post gone",
    (await getNewsPostById(scriptDb, p2.id)) === null
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
