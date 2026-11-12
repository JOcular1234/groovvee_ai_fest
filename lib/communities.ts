import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isUniqueViolation,
  SlugConflictError,
  uniqueSlug,
} from "@/lib/slug";
import type { CommunityInput } from "@/lib/validation/community";

export const publishedCommunityWhere = { published: true } as const;

const publicSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  category: true,
  description: true,
  imageUrl: true,
  city: true,
  country: true,
  joinUrl: true,
} satisfies Prisma.CommunitySelect;

const adminOrderBy: Prisma.CommunityOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export const ADMIN_COMMUNITIES_PAGE_SIZE = 20;
export const FEATURED_COMMUNITIES_LIMIT = 6;

async function slugTaken(
  db: PrismaClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.community.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

const nextSlug = (db: PrismaClient, base: string) =>
  uniqueSlug((s) => slugTaken(db, s), base);

export async function listCommunitiesForAdmin(
  db: PrismaClient,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.CommunityWhereInput = opts.q
    ? {
        OR: [
          { name: { contains: opts.q, mode: "insensitive" } },
          { city: { contains: opts.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, communities] = await Promise.all([
    db.community.count({ where }),
    db.community.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_COMMUNITIES_PAGE_SIZE,
      take: ADMIN_COMMUNITIES_PAGE_SIZE,
    }),
  ]);

  return {
    communities,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_COMMUNITIES_PAGE_SIZE)),
  };
}

export async function getCommunityById(db: PrismaClient, id: string) {
  return db.community.findUnique({ where: { id } });
}

type CommunityWriteInput = Omit<CommunityInput, "slug"> & { slug: string };

export async function createCommunity(
  db: PrismaClient,
  input: CommunityWriteInput
) {
  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.name));
  for (let attempt = 0; ; attempt++) {
    if (await slugTaken(db, slug)) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.name);
      continue;
    }
    try {
      return await db.community.create({ data: { ...input, slug } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.name);
    }
  }
}

export async function updateCommunity(
  db: PrismaClient,
  id: string,
  input: CommunityWriteInput
) {
  const existing = await db.community.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) return null;

  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.name));
  for (let attempt = 0; ; attempt++) {
    if (slug !== existing.slug && (await slugTaken(db, slug, id))) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.name);
      continue;
    }
    try {
      return await db.community.update({
        where: { id },
        data: { ...input, slug },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.name);
    }
  }
}

export async function deleteCommunity(db: PrismaClient, id: string) {
  const existing = await db.community.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await db.community.delete({ where: { id } });
  return true;
}

export async function setCommunityPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.community.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.community.update({ where: { id }, data: { published } });
}

export async function setCommunityFeatured(
  db: PrismaClient,
  id: string,
  featured: boolean
) {
  const existing = await db.community.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.community.update({ where: { id }, data: { featured } });
}

export async function moveCommunity(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.community.findMany({
    orderBy: adminOrderBy,
    select: { id: true },
  });
  const index = all.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((c, i) =>
      db.community.update({ where: { id: c.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Public queries (unpublished communities are never returned) ---

export async function queryPublishedCommunities(
  db: PrismaClient,
  opts: { category?: CommunityInput["category"] } = {}
) {
  return db.community.findMany({
    where: {
      ...publishedCommunityWhere,
      ...(opts.category ? { category: opts.category } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: publicSelect,
  });
}

export async function queryCommunityBySlug(db: PrismaClient, slug: string) {
  return db.community.findFirst({
    where: { ...publishedCommunityWhere, slug },
    select: publicSelect,
  });
}

export async function queryFeaturedCommunities(db: PrismaClient) {
  return db.community.findMany({
    where: { ...publishedCommunityWhere, featured: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: FEATURED_COMMUNITIES_LIMIT,
    select: publicSelect,
  });
}
