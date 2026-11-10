import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { TopicInput } from "@/lib/validation/topic";
import {
  isUniqueViolation,
  SlugConflictError,
  slugify,
  uniqueSlug,
} from "@/lib/slug";

export const publishedTopicWhere = { published: true } as const;

const publicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  imageUrl: true,
} satisfies Prisma.TopicSelect;

const adminOrderBy: Prisma.TopicOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export const ADMIN_TOPICS_PAGE_SIZE = 20;
export const HOMEPAGE_TOPICS_LIMIT = 7; // grid has 8 cells; the 8th is the CTA tile

// Re-exported for existing callers (actions, tests).
export { SlugConflictError, slugify };

async function slugTaken(
  db: PrismaClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.topic.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

const nextSlug = (db: PrismaClient, base: string) =>
  uniqueSlug((s) => slugTaken(db, s), base);

export async function listTopicsForAdmin(
  db: PrismaClient,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.TopicWhereInput = opts.q
    ? { title: { contains: opts.q, mode: "insensitive" } }
    : {};

  const [total, topics] = await Promise.all([
    db.topic.count({ where }),
    db.topic.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_TOPICS_PAGE_SIZE,
      take: ADMIN_TOPICS_PAGE_SIZE,
    }),
  ]);

  return {
    topics,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_TOPICS_PAGE_SIZE)),
  };
}

export async function getTopicById(db: PrismaClient, id: string) {
  return db.topic.findUnique({ where: { id } });
}

// `input.slug === ""` means auto-generate. Auto-generated slugs retry with a
// suffix on collision (including races lost to the unique constraint); a
// manually entered slug conflicts loudly via SlugConflictError.
export async function createTopic(
  db: PrismaClient,
  input: Omit<TopicInput, "slug"> & { slug: string }
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
      return await db.topic.create({ data: { ...input, slug } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function updateTopic(
  db: PrismaClient,
  id: string,
  input: Omit<TopicInput, "slug"> & { slug: string }
) {
  const existing = await db.topic.findUnique({
    where: { id },
    select: { id: true, slug: true },
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
      return await db.topic.update({
        where: { id },
        data: { ...input, slug },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function deleteTopic(db: PrismaClient, id: string) {
  const existing = await db.topic.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await db.topic.delete({ where: { id } });
  return true;
}

export async function setTopicPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.topic.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.topic.update({ where: { id }, data: { published } });
}

export async function moveTopic(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.topic.findMany({
    orderBy: adminOrderBy,
    select: { id: true },
  });
  const index = all.findIndex((t) => t.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((t, i) =>
      db.topic.update({ where: { id: t.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Public queries (unpublished topics are never returned) ---

export async function queryPublishedTopics(db: PrismaClient) {
  return db.topic.findMany({
    where: publishedTopicWhere,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: publicSelect,
  });
}

export async function queryHomepageTopics(db: PrismaClient) {
  return db.topic.findMany({
    where: publishedTopicWhere,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: HOMEPAGE_TOPICS_LIMIT,
    select: publicSelect,
  });
}
