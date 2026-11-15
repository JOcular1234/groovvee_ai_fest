import { closeScriptDb, scriptDb, waitForDb } from "./test-db";
import {
  createNewsPost,
  deleteNewsPost,
  getNewsPostById,
  listNewsPostsForAdmin,
  newsPostStatus,
  queryLatestNewsPosts,
  queryNewsPostBySlug,
  queryNewsTags,
  queryPublishedNewsPosts,
  setNewsPostPublished,
  updateNewsPost,
} from "../lib/news";
import { parseBody, plainText } from "../lib/news-body";
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

  const publicList = await queryPublishedNewsPosts(scriptDb);
  check(
    "public list only shows published",
    publicList.posts.some((p) => p.id === p1.id) &&
      publicList.posts.some((p) => p.id === p2.id)
  );

  await setNewsPostPublished(scriptDb, p2.id, false);
  const afterUnpublish = await queryPublishedNewsPosts(scriptDb);
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

  console.log("\n— Scheduling —");
  const future = new Date(Date.now() + 24 * 3600 * 1000);
  const sched = await createNewsPost(
    scriptDb,
    postInput({
      title: "TEST_Scheduled",
      published: true,
      publishedAt: future.toISOString(),
    })
  );
  check(
    "explicit future publishedAt is stored",
    sched.publishedAt?.getTime() === future.getTime()
  );
  check("status is scheduled", newsPostStatus(sched) === "scheduled");
  check(
    "scheduled post hidden from slug page",
    (await queryNewsPostBySlug(scriptDb, sched.slug)) === null
  );
  check(
    "scheduled post hidden from list",
    !(await queryPublishedNewsPosts(scriptDb)).posts.some(
      (p) => p.id === sched.id
    )
  );
  const later = new Date(future.getTime() + 60_000);
  check(
    "scheduled post live once its time passes",
    (await queryNewsPostBySlug(scriptDb, sched.slug, later))?.id === sched.id
  );
  check(
    "status is published after its time",
    newsPostStatus(sched, later) === "published"
  );

  console.log("\n— Tags, featured & reading time —");
  const parsedTags = newsPostFormSchema.safeParse({
    ...postInput(),
    tags: " Generative AI, events,events , ",
  });
  check(
    "tags normalised and de-duplicated",
    parsedTags.success &&
      parsedTags.data.tags.join("|") === "generative-ai|events"
  );
  check(
    "rejects more than 8 tags",
    !newsPostFormSchema.safeParse({
      ...postInput(),
      tags: "a,b,c,d,e,f,g,h,i",
    }).success
  );

  const longBody = Array.from({ length: 450 }, () => "word").join(" ");
  const f1 = await createNewsPost(
    scriptDb,
    postInput({
      title: "TEST_Featured One",
      published: true,
      featured: true,
      tags: "test-tag-x",
      body: longBody,
    })
  );
  check("reading time computed (450 words → 3 min)", f1.readingMinutes === 3);
  const f2 = await createNewsPost(
    scriptDb,
    postInput({ title: "TEST_Featured Two", published: true, featured: true })
  );
  const f1After = await getNewsPostById(scriptDb, f1.id);
  check(
    "featuring a post un-features the previous one",
    f2.featured && f1After?.featured === false
  );

  const listing = await queryPublishedNewsPosts(scriptDb);
  check(
    "featured post returned separately and excluded from grid",
    listing.featured?.id === f2.id &&
      !listing.posts.some((p) => p.id === f2.id)
  );
  const tagged = await queryPublishedNewsPosts(scriptDb, { tag: "test-tag-x" });
  check(
    "tag filter returns only tagged posts, no featured hero",
    tagged.featured === null &&
      tagged.posts.length === 1 &&
      tagged.posts[0].id === f1.id
  );
  check(
    "tag list includes the tag",
    (await queryNewsTags(scriptDb)).some((t) => t.tag === "test-tag-x")
  );

  console.log("\n— Body formatting —");
  const blocks = parseBody(
    "## Heading\n\n- one\n- two\n\nSee [docs](https://example.com) and [bad](javascript:alert(1)) and [rel](//evil.com)."
  );
  check(
    "parses heading and list",
    blocks[0]?.t === "h2" && blocks[1]?.t === "ul" && blocks[1].items.length === 2
  );
  const para = blocks[2];
  const links =
    para?.t === "p"
      ? para.lines[0].filter((n) => n.t === "link").map((n) => n.href)
      : [];
  check(
    "only safe links become links",
    links.length === 1 && links[0] === "https://example.com"
  );
  check(
    "plainText strips markers",
    plainText("## Title\n\n**bold** [x](https://a.test)") === "Title\n\nbold x"
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
