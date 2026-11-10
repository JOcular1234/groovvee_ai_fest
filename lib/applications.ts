import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type {
  ApplicationSubmitInput,
  ReviewStatus,
} from "@/lib/validation/application";

export const ADMIN_APPLICATIONS_PAGE_SIZE = 20;

export type AdminApplicationFilters = {
  q?: string;
  page?: number;
  status?: ReviewStatus | "PENDING";
};

export async function listApplicationsForAdmin(
  db: PrismaClient,
  opts: AdminApplicationFilters = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.SpeakerApplicationWhereInput = {};
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { email: { contains: opts.q, mode: "insensitive" } },
      { talkTitle: { contains: opts.q, mode: "insensitive" } },
    ];
  }
  if (opts.status) where.status = opts.status;

  const [total, applications] = await Promise.all([
    db.speakerApplication.count({ where }),
    db.speakerApplication.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * ADMIN_APPLICATIONS_PAGE_SIZE,
      take: ADMIN_APPLICATIONS_PAGE_SIZE,
    }),
  ]);

  return {
    applications,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_APPLICATIONS_PAGE_SIZE)),
  };
}

export async function getApplicationById(db: PrismaClient, id: string) {
  return db.speakerApplication.findUnique({
    where: { id },
    include: {
      speaker: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

// Public submission — always PENDING, never reviewer/speaker fields.
export async function submitApplication(
  db: PrismaClient,
  input: ApplicationSubmitInput
) {
  return db.speakerApplication.create({
    data: {
      name: input.name,
      email: input.email,
      organization: input.organization,
      talkTitle: input.talkTitle,
      bio: input.bio,
      links: input.links,
    },
  });
}

export const INVALID_TRANSITION = "invalid_transition";

// Allowed status moves. ACCEPTED/REJECTED are terminal — re-deciding requires
// no schema change but is deliberately not supported in v1.
const TRANSITIONS: Record<string, ReviewStatus[]> = {
  PENDING: ["REVIEWED", "ACCEPTED", "REJECTED"],
  REVIEWED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

export async function setApplicationStatus(
  db: PrismaClient,
  id: string,
  reviewerId: string,
  status: ReviewStatus
) {
  const existing = await db.speakerApplication.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return null;
  if (!TRANSITIONS[existing.status]?.includes(status)) {
    throw new Error(INVALID_TRANSITION);
  }
  return db.speakerApplication.update({
    where: { id },
    data: { status, reviewerId, reviewedAt: new Date() },
  });
}

export async function updateApplicationNotes(
  db: PrismaClient,
  id: string,
  reviewerId: string,
  notes: string | null
) {
  const existing = await db.speakerApplication.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.speakerApplication.update({
    where: { id },
    data: { reviewNotes: notes, reviewerId },
  });
}

export const NOT_ACCEPTED = "not_accepted";

// Promote an ACCEPTED application to an unpublished Speaker draft.
// Atomic + idempotent: the conditional updateMany claim means a second
// (or concurrent) promotion rolls back rather than duplicating the speaker.
// Returns the speaker id — either newly created or already linked.
export async function promoteApplicationToSpeaker(
  db: PrismaClient,
  id: string
): Promise<string> {
  return db.$transaction(async (tx) => {
    const app = await tx.speakerApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        speakerId: true,
        name: true,
        talkTitle: true,
        organization: true,
        bio: true,
        links: true,
      },
    });
    if (!app) throw new Error("not_found");
    if (app.speakerId) return app.speakerId;
    if (app.status !== "ACCEPTED") throw new Error(NOT_ACCEPTED);

    const speaker = await tx.speaker.create({
      data: {
        name: app.name,
        title: app.talkTitle ?? "",
        organization: app.organization ?? "",
        bio: app.bio,
        socials: app.links ?? [],
        published: false,
      },
      select: { id: true },
    });

    const claimed = await tx.speakerApplication.updateMany({
      where: { id: app.id, speakerId: null },
      data: { speakerId: speaker.id },
    });
    if (claimed.count === 0) {
      // Someone else promoted first — roll back the speaker we just made.
      throw new Error("already_promoted");
    }
    return speaker.id;
  });
}
