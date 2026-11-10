import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { SpeakerInput } from "@/lib/validation/speaker";

// Public visibility rule — published only. Shared by admin service and the
// cached public query so the definition can't drift.
export const publishedSpeakerWhere = { published: true } as const;

const publicSelect = {
  id: true,
  name: true,
  title: true,
  organization: true,
  bio: true,
  imageUrl: true,
  socials: true,
} satisfies Prisma.SpeakerSelect;

const adminOrderBy: Prisma.SpeakerOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export const ADMIN_SPEAKERS_PAGE_SIZE = 20;
export const FEATURED_SPEAKERS_LIMIT = 8;

export async function listSpeakersForAdmin(
  db: PrismaClient,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.SpeakerWhereInput = opts.q
    ? {
        OR: [
          { name: { contains: opts.q, mode: "insensitive" } },
          { organization: { contains: opts.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, speakers] = await Promise.all([
    db.speaker.count({ where }),
    db.speaker.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_SPEAKERS_PAGE_SIZE,
      take: ADMIN_SPEAKERS_PAGE_SIZE,
    }),
  ]);

  return {
    speakers,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_SPEAKERS_PAGE_SIZE)),
  };
}

export async function getSpeakerById(db: PrismaClient, id: string) {
  return db.speaker.findUnique({ where: { id } });
}

export async function createSpeaker(db: PrismaClient, input: SpeakerInput) {
  return db.speaker.create({
    data: { ...input, socials: input.socials },
  });
}

export async function updateSpeaker(
  db: PrismaClient,
  id: string,
  input: SpeakerInput
) {
  const existing = await db.speaker.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return db.speaker.update({
    where: { id },
    data: { ...input, socials: input.socials },
  });
}

// Deleting a speaker only removes join-table links — the AgendaItem rows
// themselves survive (FK ON DELETE CASCADE on _AgendaItemToSpeaker).
export async function deleteSpeaker(db: PrismaClient, id: string) {
  const existing = await db.speaker.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  await db.speaker.delete({ where: { id } });
  return true;
}

export async function setSpeakerPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.speaker.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return db.speaker.update({ where: { id }, data: { published } });
}

export async function setSpeakerFeatured(
  db: PrismaClient,
  id: string,
  featured: boolean
) {
  const existing = await db.speaker.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return db.speaker.update({ where: { id }, data: { featured } });
}

// Reorders by swapping the speaker with its neighbor in the canonical ordering,
// then renormalizes every sortOrder to its index. Deterministic even when
// several rows share the same sortOrder.
export async function moveSpeaker(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.speaker.findMany({
    orderBy: adminOrderBy,
    select: { id: true },
  });
  const index = all.findIndex((s) => s.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((s, i) =>
      db.speaker.update({ where: { id: s.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Public queries (unpublished speakers are never returned) ---

export async function queryPublishedSpeakers(db: PrismaClient) {
  return db.speaker.findMany({
    where: publishedSpeakerWhere,
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    select: publicSelect,
  });
}

export async function queryFeaturedSpeakers(db: PrismaClient) {
  return db.speaker.findMany({
    where: { ...publishedSpeakerWhere, featured: true },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    take: FEATURED_SPEAKERS_LIMIT,
    select: publicSelect,
  });
}
