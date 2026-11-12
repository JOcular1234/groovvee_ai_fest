import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { zonedToUtc } from "@/lib/datetime";
import {
  isUniqueViolation,
  SlugConflictError,
  uniqueSlug,
} from "@/lib/slug";
import type {
  CompetitionInput,
  CompetitionRoundInput,
} from "@/lib/validation/competition";

export const publishedCompetitionWhere = { published: true } as const;

const adminOrderBy: Prisma.CompetitionOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export const ADMIN_COMPETITIONS_PAGE_SIZE = 20;

async function slugTaken(
  db: PrismaClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.competition.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

const nextSlug = (db: PrismaClient, base: string) =>
  uniqueSlug((s) => slugTaken(db, s), base);

export async function listCompetitionsForAdmin(
  db: PrismaClient,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.CompetitionWhereInput = opts.q
    ? { title: { contains: opts.q, mode: "insensitive" } }
    : {};

  const [total, competitions] = await Promise.all([
    db.competition.count({ where }),
    db.competition.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_COMPETITIONS_PAGE_SIZE,
      take: ADMIN_COMPETITIONS_PAGE_SIZE,
      include: { _count: { select: { applications: true } } },
    }),
  ]);

  return {
    competitions,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_COMPETITIONS_PAGE_SIZE)),
  };
}

export async function getCompetitionById(db: PrismaClient, id: string) {
  return db.competition.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

async function competitionData(
  db: PrismaClient,
  input: CompetitionInput,
  slug: string
) {
  const { startsAtLocal, endsAtLocal, timezone, eventId, ...rest } = input;
  const startsAt = startsAtLocal ? zonedToUtc(startsAtLocal, timezone) : null;
  const endsAt = endsAtLocal ? zonedToUtc(endsAtLocal, timezone) : null;
  if ((startsAtLocal && !startsAt) || (endsAtLocal && !endsAt)) {
    throw new Error("invalid_datetime");
  }
  if (eventId) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new Error("invalid_event");
  }
  return { ...rest, slug, timezone, startsAt, endsAt, eventId };
}

export async function createCompetition(
  db: PrismaClient,
  input: CompetitionInput
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
      const data = await competitionData(db, input, slug);
      return await db.competition.create({ data });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function updateCompetition(
  db: PrismaClient,
  id: string,
  input: CompetitionInput
) {
  const existing = await db.competition.findUnique({
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
      const data = await competitionData(db, input, slug);
      return await db.competition.update({ where: { id }, data });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

// Applications, teams and submissions are Restrict — refuse to delete a
// competition that has entries so the admin doesn't hit a raw FK error.
export async function deleteCompetition(
  db: PrismaClient,
  id: string
): Promise<"not_found" | "has_entries" | "deleted"> {
  const existing = await db.competition.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return "not_found";

  const [applications, teams, submissions] = await Promise.all([
    db.competitionApplication.count({ where: { competitionId: id } }),
    db.competitionTeam.count({ where: { competitionId: id } }),
    db.challengeSubmission.count({ where: { competitionId: id } }),
  ]);
  if (applications + teams + submissions > 0) return "has_entries";

  await db.competition.delete({ where: { id } });
  return "deleted";
}

export async function setCompetitionPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.competition.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.competition.update({ where: { id }, data: { published } });
}

export async function setCompetitionFeatured(
  db: PrismaClient,
  id: string,
  featured: boolean
) {
  const existing = await db.competition.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.competition.update({ where: { id }, data: { featured } });
}

export async function moveCompetition(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.competition.findMany({
    orderBy: adminOrderBy,
    select: { id: true },
  });
  const index = all.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((c, i) =>
      db.competition.update({ where: { id: c.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Rounds (dates interpreted in the parent competition's timezone) ---

function roundData(input: CompetitionRoundInput, timezone: string) {
  const { startsAtLocal, endsAtLocal, ...rest } = input;
  const startsAt = startsAtLocal ? zonedToUtc(startsAtLocal, timezone) : null;
  const endsAt = endsAtLocal ? zonedToUtc(endsAtLocal, timezone) : null;
  if ((startsAtLocal && !startsAt) || (endsAtLocal && !endsAt)) {
    throw new Error("invalid_datetime");
  }
  return { ...rest, startsAt, endsAt };
}

export async function createCompetitionRound(
  db: PrismaClient,
  competitionId: string,
  input: CompetitionRoundInput
) {
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, timezone: true },
  });
  if (!competition) return null;
  return db.competitionRound.create({
    data: {
      competitionId,
      ...roundData(input, competition.timezone),
    },
  });
}

export async function updateCompetitionRound(
  db: PrismaClient,
  id: string,
  input: CompetitionRoundInput
) {
  const round = await db.competitionRound.findUnique({
    where: { id },
    select: { id: true, competition: { select: { timezone: true } } },
  });
  if (!round) return null;
  return db.competitionRound.update({
    where: { id },
    data: roundData(input, round.competition.timezone),
  });
}

export async function deleteCompetitionRound(db: PrismaClient, id: string) {
  const existing = await db.competitionRound.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await db.competitionRound.delete({ where: { id } });
  return true;
}

export async function moveCompetitionRound(
  db: PrismaClient,
  competitionId: string,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.competitionRound.findMany({
    where: { competitionId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const index = all.findIndex((r) => r.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((r, i) =>
      db.competitionRound.update({ where: { id: r.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

const publicSelect = {
  id: true,
  title: true,
  slug: true,
  kind: true,
  status: true,
  description: true,
  prizeText: true,
  rulesUrl: true,
  imageUrl: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  featured: true,
} satisfies Prisma.CompetitionSelect;

// --- Public queries (unpublished competitions are never returned) ---

export async function queryPublishedCompetitions(db: PrismaClient) {
  return db.competition.findMany({
    where: publishedCompetitionWhere,
    orderBy: [
      { featured: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: publicSelect,
  });
}

export async function queryCompetitionBySlug(db: PrismaClient, slug: string) {
  return db.competition.findFirst({
    where: { ...publishedCompetitionWhere, slug },
    select: {
      ...publicSelect,
      event: { select: { title: true, slug: true } },
      rounds: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });
}

// The latest published Hack Wars edition — for the /hack-wars landing page.
// Registration resolution for applications stays in lib/hack-wars.ts.
export async function queryHackWarsCompetition(db: PrismaClient) {
  return db.competition.findFirst({
    where: { ...publishedCompetitionWhere, kind: "HACK_WARS" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      kind: true,
      status: true,
      description: true,
      prizeText: true,
    },
  });
}
