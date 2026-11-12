import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isUniqueViolation,
  SlugConflictError,
  uniqueSlug,
} from "@/lib/slug";
import type { NewsPostInput } from "@/lib/validation/news";

export const publishedNewsPostWhere = { published: true } as const;

const publicListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
  createdAt: true,
} satisfies Prisma.NewsPostSelect;

const publicPostSelect = {
  ...publicListSelect,
  body: true,
  sourceUrl: true,
} satisfies Prisma.NewsPostSelect;

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

// `input.slug === ""` means auto-generate. Publishing sets publishedAt once —
// re-publishing keeps the original timestamp.
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
      return await db.newsPost.create({
        data: {
          ...input,
          slug,
          publishedAt: input.published ? new Date() : null,
        },
      });
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
      return await db.newsPost.update({
        where: { id },
        data: {
          ...input,
          slug,
          publishedAt: input.published
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
        },
      });
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

// --- Public queries (unpublished posts are never returned) ---

export async function queryPublishedNewsPosts(
  db: PrismaClient,
  page = 1
) {
  const p = Math.max(1, page);
  const [total, posts] = await Promise.all([
    db.newsPost.count({ where: publishedNewsPostWhere }),
    db.newsPost.findMany({
      where: publishedNewsPostWhere,
      orderBy: publicOrderBy,
      skip: (p - 1) * PUBLIC_NEWS_PAGE_SIZE,
      take: PUBLIC_NEWS_PAGE_SIZE,
      select: publicListSelect,
    }),
  ]);
  return {
    posts,
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PUBLIC_NEWS_PAGE_SIZE)),
  };
}

export async function queryNewsPostBySlug(db: PrismaClient, slug: string) {
  return db.newsPost.findFirst({
    where: { ...publishedNewsPostWhere, slug },
    select: publicPostSelect,
  });
}

export async function queryLatestNewsPosts(
  db: PrismaClient,
  excludeId: string,
  take = 3
) {
  return db.newsPost.findMany({
    where: { ...publishedNewsPostWhere, id: { not: excludeId } },
    orderBy: publicOrderBy,
    take,
    select: publicListSelect,
  });
}
