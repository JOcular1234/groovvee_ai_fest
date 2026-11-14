import { createHash, randomBytes } from "node:crypto";

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

// Double opt-in. A submission creates (or refreshes) a PENDING registration
// and returns a one-time confirmation token for the email link; it only
// counts once confirmed. Callers must answer the visitor identically for
// every ok:true outcome — whether an email is already registered is never
// revealed on screen, only in an email to that address.
//   pending           — send the confirmation link (confirmToken set), or
//                       nothing if one was sent moments ago (null)
//   already_confirmed — send an "already registered" notice
export type RegisterResult =
  | {
      ok: true;
      status: "pending";
      confirmToken: string | null;
      event: { title: string; slug: string };
    }
  | {
      ok: true;
      status: "already_confirmed";
      event: { title: string; slug: string };
    }
  | { ok: false; reason: "not_found" | "not_eligible" | "closed" };

// Don't resend confirmation mail to the same pending registration more often
// than this — bounds mail an attacker can trigger at one inbox.
export const CONFIRM_RESEND_MS = 5 * 60 * 1000;

// An email that stays unconfirmed for a month won't be — delete the row so
// unverified PII doesn't linger in the database (see /privacy).
export const PENDING_REGISTRATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function pruneUnconfirmedRegistrations(db: PrismaClient) {
  return db.eventRegistration.deleteMany({
    where: {
      confirmedAt: null,
      createdAt: { lt: new Date(Date.now() - PENDING_REGISTRATION_TTL_MS) },
    },
  });
}

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(`reg-confirm|${token}`).digest("hex");
}

export async function registerForEvent(
  db: PrismaClient,
  eventSlug: string,
  input: RegistrationSubmitInput
): Promise<RegisterResult> {
  const event = await db.event.findUnique({
    where: { slug: eventSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      source: true,
      startsAt: true,
    },
  });

  // Unpublished events are indistinguishable from missing ones — don't leak
  // that a draft slug exists.
  if (!event || !event.published) return { ok: false, reason: "not_found" };
  if (event.source !== "GROOVVEE")
    return { ok: false, reason: "not_eligible" };
  if (event.startsAt.getTime() <= Date.now())
    return { ok: false, reason: "closed" };

  const info = { title: event.title, slug: event.slug };
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  try {
    await db.eventRegistration.create({
      data: {
        eventId: event.id,
        name: input.name,
        email: input.email,
        organization: input.organization,
        confirmTokenHash: hashConfirmToken(token),
        confirmSentAt: now,
      },
    });
    // Opportunistic sweep: each new registration also clears expired pending
    // rows so unconfirmed emails are never retained long-term.
    await pruneUnconfirmedRegistrations(db).catch(() => {});
    return { ok: true, status: "pending", confirmToken: token, event: info };
  } catch (err) {
    // The @@unique(eventId, email) constraint is the authoritative dedupe —
    // catches double clicks and concurrent requests a pre-check would miss.
    if (
      !(err instanceof Prisma.PrismaClientKnownRequestError) ||
      err.code !== "P2002"
    ) {
      throw err;
    }
  }

  const existing = await db.eventRegistration.findUnique({
    where: { eventId_email: { eventId: event.id, email: input.email } },
    select: { id: true, confirmedAt: true, confirmSentAt: true },
  });
  if (!existing || existing.confirmedAt) {
    return { ok: true, status: "already_confirmed", event: info };
  }

  // Still pending: rotate the token (old links stop working) and resend —
  // unless a link went out moments ago. The conditional update makes the
  // throttle hold under concurrent submits. Name/organization from the
  // unconfirmed submission are refreshed: the address owner confirms
  // whatever details are current.
  const { count } = await db.eventRegistration.updateMany({
    where: {
      id: existing.id,
      confirmedAt: null,
      OR: [
        { confirmSentAt: null },
        { confirmSentAt: { lt: new Date(now.getTime() - CONFIRM_RESEND_MS) } },
      ],
    },
    data: {
      name: input.name,
      organization: input.organization,
      confirmTokenHash: hashConfirmToken(token),
      confirmSentAt: now,
    },
  });
  return {
    ok: true,
    status: "pending",
    confirmToken: count === 1 ? token : null,
    event: info,
  };
}

export type ConfirmResult =
  | { ok: true; event: { title: string; slug: string } }
  | { ok: false; reason: "invalid" | "closed" };

// Confirms a pending registration from its emailed token. One conditional
// update: the token is cleared on success, so a link works exactly once.
export async function confirmRegistration(
  db: PrismaClient,
  token: string,
  now: Date = new Date()
): Promise<ConfirmResult> {
  if (!token || token.length > 100) return { ok: false, reason: "invalid" };
  const tokenHash = hashConfirmToken(token);
  const reg = await db.eventRegistration.findUnique({
    where: { confirmTokenHash: tokenHash },
    select: {
      id: true,
      event: { select: { title: true, slug: true, startsAt: true, published: true } },
    },
  });
  if (!reg || !reg.event.published) return { ok: false, reason: "invalid" };
  if (reg.event.startsAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "closed" };
  }
  const { count } = await db.eventRegistration.updateMany({
    where: { id: reg.id, confirmTokenHash: tokenHash, confirmedAt: null },
    data: { confirmedAt: now, confirmTokenHash: null },
  });
  if (count !== 1) return { ok: false, reason: "invalid" };
  return { ok: true, event: { title: reg.event.title, slug: reg.event.slug } };
}

// Lookup for the confirmation page, which shows the event before the
// visitor clicks Confirm (links are never confirmed on GET — mail scanners
// prefetch links).
export async function findPendingRegistrationByToken(
  db: PrismaClient,
  token: string
) {
  if (!token || token.length > 100) return null;
  return db.eventRegistration.findUnique({
    where: { confirmTokenHash: hashConfirmToken(token) },
    select: { event: { select: { title: true, slug: true, startsAt: true, timezone: true } } },
  });
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
      confirmedAt: true,
      createdAt: true,
    },
  });
}

export function countConfirmedRegistrations(db: PrismaClient, eventId: string) {
  return db.eventRegistration.count({
    where: { eventId, confirmedAt: { not: null } },
  });
}
