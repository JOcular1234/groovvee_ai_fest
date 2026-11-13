import { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { RegistrationSubmitInput } from "@/lib/validation/registration";

export const ADMIN_REGISTRATIONS_PAGE_SIZE = 50;

type RegistrationEvent = {
  source: "GROOVVEE" | "EXTERNAL";
  startsAt: Date;
};

// Single source of truth for display eligibility — shared by the detail
// page's Register button and the register page. Callers only pass published
// events (public queries filter on it); the write path re-checks everything
// itself since it needs distinct not-found vs ineligible semantics.
// External (community-discovered) events never take native registrations;
// they keep their organiser's outbound link. Registration closes when the
// event starts.
export function isRegistrationOpen(
  event: RegistrationEvent,
  now: Date = new Date()
): boolean {
  return (
    event.source === "GROOVVEE" && event.startsAt.getTime() > now.getTime()
  );
}

export type RegisterResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "not_eligible" | "closed" | "duplicate";
    };

export async function registerForEvent(
  db: PrismaClient,
  eventSlug: string,
  input: RegistrationSubmitInput
): Promise<RegisterResult> {
  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true, published: true, source: true, startsAt: true },
  });

  // Unpublished events are indistinguishable from missing ones — don't leak
  // that a draft slug exists.
  if (!event || !event.published) return { ok: false, reason: "not_found" };
  if (event.source !== "GROOVVEE")
    return { ok: false, reason: "not_eligible" };
  if (event.startsAt.getTime() <= Date.now())
    return { ok: false, reason: "closed" };

  try {
    await db.eventRegistration.create({
      data: {
        eventId: event.id,
        name: input.name,
        email: input.email,
        organization: input.organization,
      },
    });
    return { ok: true };
  } catch (err) {
    // The @@unique(eventId, email) constraint is the authoritative dedupe —
    // catches double clicks and concurrent requests a pre-check would miss.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, reason: "duplicate" };
    }
    throw err;
  }
}

export async function listRegistrationsForAdmin(
  db: PrismaClient,
  eventId: string,
  opts: { q?: string; page?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.EventRegistrationWhereInput = { eventId };
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { email: { contains: opts.q, mode: "insensitive" } },
      { organization: { contains: opts.q, mode: "insensitive" } },
    ];
  }

  const [total, registrations] = await Promise.all([
    db.eventRegistration.count({ where }),
    db.eventRegistration.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      skip: (page - 1) * ADMIN_REGISTRATIONS_PAGE_SIZE,
      take: ADMIN_REGISTRATIONS_PAGE_SIZE,
    }),
  ]);

  return {
    registrations,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_REGISTRATIONS_PAGE_SIZE)),
  };
}

// Full list for CSV export — admin-only, ordered oldest first.
export async function listAllRegistrationsForAdmin(
  db: PrismaClient,
  eventId: string
) {
  return db.eventRegistration.findMany({
    where: { eventId },
    orderBy: [{ createdAt: "asc" }],
    select: {
      name: true,
      email: true,
      organization: true,
      createdAt: true,
    },
  });
}
