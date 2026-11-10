import { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type {
  HackWarsApplyInput,
  ReviewStatus,
} from "@/lib/validation/hack-wars";

export const ADMIN_HACK_WARS_PAGE_SIZE = 20;

export const REGISTRATION_CLOSED = "registration_closed";
export const DUPLICATE_APPLICATION = "duplicate_application";
export const INVALID_TRANSITION = "invalid_transition";

// The public apply flow resolves the open Hack Wars competition dynamically —
// never a hardcoded id.
export async function findOpenHackWarsCompetition(db: PrismaClient) {
  return db.competition.findFirst({
    where: {
      kind: "HACK_WARS",
      status: "REGISTRATION_OPEN",
      published: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });
}

// Public submission — always PENDING, never reviewer fields. Team applicants
// get a CompetitionTeam + participant rows (leader + members); individuals
// apply without a team.
export async function submitHackWarsApplication(
  db: PrismaClient,
  competitionId: string,
  input: HackWarsApplyInput
) {
  try {
    return await db.$transaction(async (tx) => {
      const competition = await tx.competition.findUnique({
        where: { id: competitionId },
        select: { id: true, status: true },
      });
      if (!competition || competition.status !== "REGISTRATION_OPEN") {
        throw new Error(REGISTRATION_CLOSED);
      }

      let teamId: string | null = null;
      if (input.isTeam) {
        const team = await tx.competitionTeam.create({
          data: {
            competitionId,
            name: input.teamName!,
            participants: {
              create: [
                {
                  name: input.name,
                  email: input.email,
                  school: input.school,
                  role: "leader",
                },
                ...input.members.map((m) => ({
                  name: m.name,
                  email: m.email,
                  school: m.school,
                  role: "member" as const,
                })),
              ],
            },
          },
          select: { id: true },
        });
        teamId = team.id;
      }

      return tx.competitionApplication.create({
        data: {
          competitionId,
          teamId,
          contactName: input.name,
          email: input.email,
          phone: input.phone,
          school: input.school,
          major: input.major,
          gradYear: input.gradYear,
          intro: input.intro,
          previousExperience: input.previousExperience,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === REGISTRATION_CLOSED) throw err;
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(DUPLICATE_APPLICATION);
    }
    throw err;
  }
}

export type AdminHackWarsFilters = {
  q?: string;
  page?: number;
  status?: ReviewStatus | "PENDING";
  participation?: "individual" | "team";
};

export async function listHackWarsApplicationsForAdmin(
  db: PrismaClient,
  opts: AdminHackWarsFilters = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.CompetitionApplicationWhereInput = {};
  if (opts.q) {
    where.OR = [
      { contactName: { contains: opts.q, mode: "insensitive" } },
      { email: { contains: opts.q, mode: "insensitive" } },
      { school: { contains: opts.q, mode: "insensitive" } },
      { team: { name: { contains: opts.q, mode: "insensitive" } } },
    ];
  }
  if (opts.status) where.status = opts.status;
  if (opts.participation === "team") where.teamId = { not: null };
  if (opts.participation === "individual") where.teamId = null;

  const [total, applications] = await Promise.all([
    db.competitionApplication.count({ where }),
    db.competitionApplication.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * ADMIN_HACK_WARS_PAGE_SIZE,
      take: ADMIN_HACK_WARS_PAGE_SIZE,
      include: {
        team: { select: { id: true, name: true } },
        competition: { select: { id: true, title: true } },
      },
    }),
  ]);

  return {
    applications,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_HACK_WARS_PAGE_SIZE)),
  };
}

export async function getHackWarsApplicationById(db: PrismaClient, id: string) {
  return db.competitionApplication.findUnique({
    where: { id },
    include: {
      team: {
        include: {
          participants: { orderBy: { createdAt: "asc" } },
        },
      },
      competition: { select: { id: true, title: true, status: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

// Same review semantics as speaker applications: ACCEPTED/REJECTED are
// terminal decisions, REVIEWED is the intermediate state.
const TRANSITIONS: Record<string, ReviewStatus[]> = {
  PENDING: ["REVIEWED", "ACCEPTED", "REJECTED"],
  REVIEWED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

export async function setHackWarsApplicationStatus(
  db: PrismaClient,
  id: string,
  reviewerId: string,
  status: ReviewStatus
) {
  const existing = await db.competitionApplication.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return null;
  if (!TRANSITIONS[existing.status]?.includes(status)) {
    throw new Error(INVALID_TRANSITION);
  }
  return db.competitionApplication.update({
    where: { id },
    data: { status, reviewerId, reviewedAt: new Date() },
  });
}

export async function updateHackWarsApplicationNotes(
  db: PrismaClient,
  id: string,
  reviewerId: string,
  notes: string | null
) {
  const existing = await db.competitionApplication.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.competitionApplication.update({
    where: { id },
    data: { reviewNotes: notes || null, reviewerId, reviewedAt: new Date() },
  });
}
