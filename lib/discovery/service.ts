import type { PrismaClient } from "@/lib/generated/prisma/client";

import { zonedToUtc } from "@/lib/datetime";
import {
  findExactDuplicate,
  findPossibleDuplicates,
  normalizeTitle,
  normalizeUrl,
} from "@/lib/discovery/duplicates";
import type { EventDiscoveryProvider } from "@/lib/discovery/types";
import { createGeminiProvider } from "@/lib/discovery/providers/gemini";
import { createEvent } from "@/lib/events";
import type { EventInput } from "@/lib/validation/event";
import {
  discoveredCandidateSchema,
  type DiscoveredCandidate,
  type DiscoveryRunInput,
} from "@/lib/validation/discovery";

// ── Operational limits ────────────────────────────────────────────────
// One active run at a time, and a cooldown between runs — the trigger is a
// paid API call, so accidental double-clicks and rapid re-runs are bounded.
export const DISCOVERY_COOLDOWN_MS = 60_000;
export const ADMIN_DISCOVERY_PAGE_SIZE = 20;

export class DiscoveryBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryBlockedError";
  }
}
export class AlreadyReviewedError extends Error {
  constructor() {
    super("This candidate has already been reviewed.");
    this.name = "AlreadyReviewedError";
  }
}
export class CandidateNotFoundError extends Error {
  constructor() {
    super("Candidate not found.");
    this.name = "CandidateNotFoundError";
  }
}

// ── Candidate ingestion ───────────────────────────────────────────────

// "2026-12-04" / "2026-12-04T18:00" interpreted in the candidate's timezone.
// Without a timezone a bare date can't be an instant — kept as missing.
function resolveStart(candidate: DiscoveredCandidate): {
  startsAt: Date | null;
  endsAt: Date | null;
  needsStart: boolean;
} {
  if (!candidate.startDate) {
    return { startsAt: null, endsAt: null, needsStart: true };
  }
  const tz = candidate.timezone ?? "UTC";
  // Date-only → treat as 09:00 local for ordering purposes; flagged missing
  // either way when the model didn't supply a time or timezone.
  const startLocal = candidate.startDate.includes("T")
    ? candidate.startDate
    : `${candidate.startDate}T09:00`;
  const startsAt = zonedToUtc(startLocal, tz);
  let endsAt: Date | null = null;
  if (candidate.endDate) {
    const endLocal = candidate.endDate.includes("T")
      ? candidate.endDate
      : `${candidate.endDate}T18:00`;
    endsAt = zonedToUtc(endLocal, tz);
  }
  const needsStart = !startsAt || !candidate.timezone;
  const badEnd = endsAt && startsAt && endsAt <= startsAt;
  return { startsAt, endsAt: badEnd ? null : endsAt, needsStart };
}

// CITY locations only, exact name+country match — fallbacks are resolved by
// a human during review, never auto-linked.
async function resolveLocationId(
  db: PrismaClient,
  c: DiscoveredCandidate
): Promise<string | null> {
  if (!c.city || !c.country) return null;
  const loc = await db.location.findFirst({
    where: {
      type: "CITY",
      name: { equals: c.city, mode: "insensitive" },
      country: { equals: c.country, mode: "insensitive" },
    },
    select: { id: true },
  });
  return loc?.id ?? null;
}

function candidateData(
  c: DiscoveredCandidate,
  ctx: { runId: string; provider: string; model: string; connector: string; locationId: string | null }
) {
  const { startsAt, endsAt, needsStart } = resolveStart(c);
  const missing = [...c.missingFields];
  if (needsStart && !missing.includes("startsAt")) missing.push("startsAt");
  if (!c.description && !missing.includes("description")) missing.push("description");
  return {
    runId: ctx.runId,
    title: c.title.slice(0, 300),
    normalizedTitle: normalizeTitle(c.title),
    description: c.description.slice(0, 8000),
    startsAt,
    endsAt,
    timezone: c.timezone,
    venueName: c.venueName,
    city: c.city,
    stateProvince: c.stateProvince,
    country: c.country,
    locationId: ctx.locationId,
    registrationUrl: c.registrationUrl,
    sourceUrl: c.sourceUrl,
    sourceUrlNormalized: normalizeUrl(c.sourceUrl),
    imageUrl: c.imageUrl,
    provider: ctx.provider,
    model: ctx.model,
    connector: ctx.connector,
    externalId: c.externalId,
    category: c.category,
    confidence: c.confidence,
    missingFields: missing,
    evidence: c.evidence,
  };
}

// ── Run orchestration ─────────────────────────────────────────────────

export async function runDiscovery(
  db: PrismaClient,
  adminId: string,
  input: DiscoveryRunInput,
  provider?: EventDiscoveryProvider
) {
  const p = provider ?? createGeminiProvider();

  // Concurrency + rate limit, decided atomically with the run insert.
  const run = await db.$transaction(async (tx) => {
    const [running, recent] = await Promise.all([
      tx.discoveryRun.count({ where: { status: "RUNNING" } }),
      tx.discoveryRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      }),
    ]);
    if (running > 0)
      throw new DiscoveryBlockedError("A discovery run is already in progress.");
    if (recent && Date.now() - recent.startedAt.getTime() < DISCOVERY_COOLDOWN_MS)
      throw new DiscoveryBlockedError(
        `Discovery was run recently — wait ${Math.ceil(DISCOVERY_COOLDOWN_MS / 1000)}s between runs.`
      );
    return tx.discoveryRun.create({
      data: {
        adminId,
        provider: p.name,
        model: p.model,
        params: input as never,
        status: "RUNNING",
      },
    });
  });

  let found = 0;
  let inserted = 0;
  let dupes = 0;
  let invalid = 0;

  try {
    const result = await p.discover(input);
    found = result.candidates.length;

    const seen = new Set<string>();
    for (const raw of result.candidates) {
      const parsed = discoveredCandidateSchema.safeParse(raw);
      if (!parsed.success) {
        invalid++;
        continue;
      }
      const c = parsed.data;
      const key = `${normalizeTitle(c.title)}|${normalizeUrl(c.sourceUrl)}`;
      if (seen.has(key)) {
        dupes++;
        continue;
      }
      seen.add(key);

      const locationId = await resolveLocationId(db, c);
      const data = candidateData(c, {
        runId: run.id,
        provider: p.name,
        model: p.model,
        connector: p.connector,
        locationId,
      });

      const exact = await findExactDuplicate(db, {
        sourceUrl: c.sourceUrl,
        sourceUrlNormalized: data.sourceUrlNormalized,
        registrationUrl: c.registrationUrl,
        connector: p.connector,
        externalId: c.externalId,
      });
      // Already sitting in the review queue (or already approved): don't
      // re-add — also avoids the connector+externalId unique violation.
      if (exact.candidateId) {
        dupes++;
        continue;
      }

      const possible = await findPossibleDuplicates(db, {
        normalizedTitle: data.normalizedTitle,
        startsAt: data.startsAt,
        city: data.city,
        country: data.country,
        locationId: data.locationId,
      });
      const firstDupe = possible.events[0] ?? null;

      await db.discoveredEvent.create({
        data: {
          ...data,
          duplicateOfEventId: exact.eventId ?? firstDupe?.id ?? null,
          duplicateOfCandidateId: exact.candidateId ?? possible.candidates[0]?.id ?? null,
          duplicateKind:
            exact.eventId || exact.candidateId
              ? "EXACT"
              : firstDupe || possible.candidates.length
                ? "FUZZY"
                : null,
        },
      });
      if (exact.eventId || firstDupe || possible.candidates.length) dupes++;
      inserted++;
    }

    await db.discoveryRun.update({
      where: { id: run.id },
      data: {
        // FAILED only when every returned candidate was unusable; dedupes
        // are a normal outcome, not a failure.
        status:
          found > 0 && invalid === found
            ? "FAILED"
            : invalid > 0
              ? "PARTIAL"
              : "COMPLETED",
        eventsFound: found,
        eventsInserted: inserted,
        duplicatesFound: dupes,
        invalidCount: invalid,
        completedAt: new Date(),
      },
    });
    return { runId: run.id, found, inserted, dupes, invalid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.discoveryRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        eventsFound: found,
        eventsInserted: inserted,
        duplicatesFound: dupes,
        invalidCount: invalid,
        error: message.slice(0, 500),
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

// ── Admin queries ─────────────────────────────────────────────────────

// Options for the admin run form — seeded regions/countries/cities.
export async function discoveryFormOptions(db: PrismaClient) {
  const [regionRows, countryRows, cities] = await Promise.all([
    db.location.findMany({ select: { region: true }, distinct: ["region"] }),
    db.location.findMany({ select: { country: true }, distinct: ["country"] }),
    db.location.findMany({
      where: { type: "CITY" },
      select: { name: true, country: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    regions: regionRows.map((r) => r.region).sort(),
    countries: countryRows.map((r) => r.country).sort(),
    cities,
  };
}

export async function listDiscoveryRuns(db: PrismaClient, take = 10) {
  return db.discoveryRun.findMany({
    orderBy: { startedAt: "desc" },
    take,
    include: {
      admin: { select: { name: true } },
      _count: { select: { candidates: true } },
    },
  });
}

export async function discoveryStats(db: PrismaClient) {
  const rows = await db.discoveredEvent.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const dupes = await db.discoveredEvent.count({
    where: { status: "PENDING", duplicateOfEventId: { not: null } },
  });
  const get = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return {
    total: rows.reduce((n, r) => n + r._count._all, 0),
    pending: get("PENDING"),
    approved: get("APPROVED"),
    rejected: get("REJECTED"),
    duplicates: get("DUPLICATE") + dupes,
  };
}

export type CandidateFilters = {
  q?: string;
  status?: string;
  page?: number;
};

export async function listCandidates(db: PrismaClient, f: CandidateFilters = {}) {
  const page = Math.max(1, f.page ?? 1);
  const status = ["PENDING", "APPROVED", "REJECTED", "DUPLICATE"].includes(f.status ?? "")
    ? (f.status as "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE")
    : "PENDING";
  const where = {
    status,
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" as const } },
            { city: { contains: f.q, mode: "insensitive" as const } },
            { country: { contains: f.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, candidates] = await Promise.all([
    db.discoveredEvent.count({ where }),
    db.discoveredEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * ADMIN_DISCOVERY_PAGE_SIZE,
      take: ADMIN_DISCOVERY_PAGE_SIZE,
      include: {
        location: { select: { name: true, type: true, stateProvince: true, country: true } },
        duplicateOfEvent: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);
  return {
    candidates,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_DISCOVERY_PAGE_SIZE)),
    status,
  };
}

export async function getCandidate(db: PrismaClient, id: string) {
  const c = await db.discoveredEvent.findUnique({
    where: { id },
    include: {
      run: { select: { provider: true, model: true, startedAt: true } },
      location: true,
      duplicateOfEvent: { select: { id: true, title: true, slug: true } },
      duplicateOfCandidate: { select: { id: true, title: true } },
      approvedEvent: { select: { id: true, slug: true } },
      reviewer: { select: { name: true } },
    },
  });
  if (!c) return null;
  const possible =
    c.status === "PENDING"
      ? await findPossibleDuplicates(db, {
          normalizedTitle: c.normalizedTitle,
          startsAt: c.startsAt,
          city: c.city,
          country: c.country,
          locationId: c.locationId,
          excludeId: c.id,
        })
      : { events: [], candidates: [] };
  return { ...c, possible };
}

// ── Review actions ────────────────────────────────────────────────────

// Approves a candidate and creates the public Event atomically. The
// conditional updateMany is the double-approval guard: only a PENDING row
// can transition, so racing approvals can't create two events.
export async function approveCandidate(
  db: PrismaClient,
  candidateId: string,
  adminId: string,
  input: EventInput,
  reviewNotes?: string | null
) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.discoveredEvent.updateMany({
      where: { id: candidateId, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewerAdminId: adminId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
      },
    });
    const candidate = await tx.discoveredEvent.findUnique({
      where: { id: candidateId },
      select: { externalId: true, sourceUrl: true },
    });
    if (!candidate) throw new CandidateNotFoundError();
    if (claimed.count === 0) throw new AlreadyReviewedError();

    const event = await createEvent(tx as PrismaClient, {
      ...input,
      source: "EXTERNAL",
      externalId: input.externalId ?? candidate.externalId,
      published: true,
    });
    await tx.discoveredEvent.update({
      where: { id: candidateId },
      data: { approvedEventId: event.id },
    });
    return event;
  }, { timeout: 30000 });
}

export async function rejectCandidate(
  db: PrismaClient,
  candidateId: string,
  adminId: string,
  reviewNotes?: string | null
) {
  const claimed = await db.discoveredEvent.updateMany({
    where: { id: candidateId, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewerAdminId: adminId,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes ?? null,
    },
  });
  if (claimed.count === 0) {
    const exists = await db.discoveredEvent.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!exists) throw new CandidateNotFoundError();
    throw new AlreadyReviewedError();
  }
}

export async function markCandidateDuplicate(
  db: PrismaClient,
  candidateId: string,
  adminId: string,
  duplicateOfEventId: string | null,
  reviewNotes?: string | null
) {
  if (duplicateOfEventId) {
    const ev = await db.event.findUnique({
      where: { id: duplicateOfEventId },
      select: { id: true },
    });
    if (!ev) throw new Error("invalid_duplicate_target");
  }
  const claimed = await db.discoveredEvent.updateMany({
    where: { id: candidateId, status: "PENDING" },
    data: {
      status: "DUPLICATE",
      duplicateOfEventId,
      reviewerAdminId: adminId,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes ?? null,
    },
  });
  if (claimed.count === 0) {
    const exists = await db.discoveredEvent.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!exists) throw new CandidateNotFoundError();
    throw new AlreadyReviewedError();
  }
}
