import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isUniqueViolation,
  SlugConflictError,
  uniqueSlug,
} from "@/lib/slug";
import { readingMinutes } from "@/lib/news-body";
import type { NewsPostInput } from "@/lib/validation/news";

// Public visibility: published AND its publish time has arrived. A published
// post with a future publishedAt is "scheduled" and stays hidden until then.
export function liveNewsPostWhere(now = new Date()) {
  return {
    published: true,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  } satisfies Prisma.NewsPostWhereInput;
}

export type NewsPostStatus = "draft" | "scheduled" | "published";

export function newsPostStatus(
  post: { published: boolean; publishedAt: Date | null },
  now = new Date()
): NewsPostStatus {
  if (!post.published) return "draft";
  return post.publishedAt && post.publishedAt > now ? "scheduled" : "published";
}

const publicListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
  createdAt: true,
  tags: true,
  readingMinutes: true,
} satisfies Prisma.NewsPostSelect;

const publicPostSelect = {
  ...publicListSelect,
  body: true,
  sourceUrl: true,
  updatedAt: true,
} satisfies Prisma.NewsPostSelect;

export type PublicNewsPost = Prisma.NewsPostGetPayload<{
  select: typeof publicPostSelect;
}>;

const adminOrderBy: Prisma.NewsPostOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "asc" },
];

const publicOrderBy: Prisma.NewsPostOrderByWithRelationInput[] = [
  { publishedAt: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
  { id: "asc" },
];

export const ADMIN_NEWS_PAGE_SIZE = 20;
export const PUBLIC_NEWS_PAGE_SIZE = 12;

async function slugTaken(
  db: PrismaClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.newsPost.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

const nextSlug = (db: PrismaClient, base: string) =>
  uniqueSlug((s) => slugTaken(db, s), base);

export async function listNewsPostsForAdmin(
  db: PrismaClient,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.NewsPostWhereInput = opts.q
    ? {
        OR: [
          { title: { contains: opts.q, mode: "insensitive" } },
          { excerpt: { contains: opts.q, mode: "insensitive" } },
          { authorName: { contains: opts.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, posts] = await Promise.all([
    db.newsPost.count({ where }),
    db.newsPost.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_NEWS_PAGE_SIZE,
      take: ADMIN_NEWS_PAGE_SIZE,
    }),
  ]);

  return {
    posts,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_NEWS_PAGE_SIZE)),
  };
}

export async function getNewsPostById(db: PrismaClient, id: string) {
  return db.newsPost.findUnique({ where: { id } });
}

type NewsPostWriteInput = Omit<NewsPostInput, "slug"> & { slug: string };

// Featuring a post un-features any other first (a partial unique index also
// guarantees at most one), in the same transaction as the write.
function writeWithFeatured<T>(
  db: PrismaClient,
  featured: boolean,
  excludeId: string | undefined,
  write: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    if (featured) {
      await tx.newsPost.updateMany({
        where: { featured: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
        data: { featured: false },
      });
    }
    return write(tx);
  });
}

// `input.slug === ""` means auto-generate. An explicit publishedAt (future =
// scheduled, past = backdated) wins; otherwise the first publish stamps now
// and re-publishing keeps the original timestamp.
export async function createNewsPost(
  db: PrismaClient,
  input: NewsPostWriteInput
) {
  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.title));
  for (let attempt = 0; ; attempt++) {
    if (await slugTaken(db, slug)) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
      continue;
    }
    try {
      const data = {
        ...input,
        slug,
        readingMinutes: readingMinutes(input.body),
        publishedAt: input.publishedAt ?? (input.published ? new Date() : null),
      };
      return await writeWithFeatured(db, input.featured, undefined, (tx) =>
        tx.newsPost.create({ data })
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function updateNewsPost(
  db: PrismaClient,
  id: string,
  input: NewsPostWriteInput
) {
  const existing = await db.newsPost.findUnique({
    where: { id },
    select: { id: true, slug: true, publishedAt: true },
  });
  if (!existing) return null;

  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.title));
  for (let attempt = 0; ; attempt++) {
    if (slug !== existing.slug && (await slugTaken(db, slug, id))) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
      continue;
    }
    try {
      const data = {
        ...input,
        slug,
        readingMinutes: readingMinutes(input.body),
        publishedAt:
          input.publishedAt ??
          (input.published
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt),
      };
      return await writeWithFeatured(db, input.featured, id, (tx) =>
        tx.newsPost.update({ where: { id }, data })
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function deleteNewsPost(db: PrismaClient, id: string) {
  const existing = await db.newsPost.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await db.newsPost.delete({ where: { id } });
  return true;
}

export async function setNewsPostPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.newsPost.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) return null;
  return db.newsPost.update({
    where: { id },
    data: {
      published,
      // First publish stamps publishedAt; later publishes keep it.
      ...(published && !existing.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    },
  });
}

// --- Public queries (drafts and scheduled posts are never returned) ---

// The unfiltered listing shows the featured post as a hero on page 1 and
// leaves it out of the grid on every page, so pagination stays consistent.
// A tag filter is a plain list (the featured post appears in it normally).
export async function queryPublishedNewsPosts(
  db: PrismaClient,
  opts: { page?: number; tag?: string; now?: Date } = {}
) {
  const p = Math.max(1, opts.page ?? 1);
  const live = liveNewsPostWhere(opts.now);
  const featured = opts.tag
    ? null
    : await db.newsPost.findFirst({
        where: { ...live, featured: true },
        select: publicListSelect,
      });
  const where: Prisma.NewsPostWhereInput = {
    ...live,
    ...(opts.tag ? { tags: { has: opts.tag } } : {}),
    ...(featured ? { id: { not: featured.id } } : {}),
  };
  const [total, posts] = await Promise.all([
    db.newsPost.count({ where }),
    db.newsPost.findMany({
      where,
      orderBy: publicOrderBy,
      skip: (p - 1) * PUBLIC_NEWS_PAGE_SIZE,
      take: PUBLIC_NEWS_PAGE_SIZE,
      select: publicListSelect,
    }),
  ]);
  return {
    featured,
    posts,
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PUBLIC_NEWS_PAGE_SIZE)),
  };
}

// Tags in use on live posts, most-used first.
export async function queryNewsTags(db: PrismaClient, now?: Date) {
  const rows = await db.newsPost.findMany({
    where: liveNewsPostWhere(now),
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const t of rows.flatMap((r) => r.tags)) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

export async function queryNewsPostBySlug(
  db: PrismaClient,
  slug: string,
  now?: Date
) {
  return db.newsPost.findFirst({
    where: { ...liveNewsPostWhere(now), slug },
    select: publicPostSelect,
  });
}

// Admin preview: any status, same shape the public page renders.
export async function queryNewsPostForPreview(db: PrismaClient, id: string) {
  return db.newsPost.findUnique({
    where: { id },
    select: { ...publicPostSelect, published: true, featured: true },
  });
}

export async function queryLatestNewsPosts(
  db: PrismaClient,
  excludeId: string,
  take = 3,
  now?: Date
) {
  return db.newsPost.findMany({
    where: { ...liveNewsPostWhere(now), id: { not: excludeId } },
    orderBy: publicOrderBy,
    take,
    select: publicListSelect,
  });
}
