import type { PrismaClient } from "@/lib/generated/prisma/client";

// URL + title normalization for duplicate detection. Conservative by design:
// only known-junk tracking parameters are stripped — meaningful query strings
// (event ids, slugs) are preserved.

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "ref",
  "ref_src",
  "mc_cid",
  "mc_eid",
]);

export function normalizeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return raw.trim().toLowerCase();
  }
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith("utm_") && !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  const qs = params.map(([k, v]) => `${k}=${v}`).join("&");
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.hostname.toLowerCase()}${u.port ? `:${u.port}` : ""}${path}${qs ? `?${qs}` : ""}`.toLowerCase();
}

export function normalizeTitle(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Distinctive word for substring queries (skip very short/common tokens).
function keyToken(normalized: string): string | null {
  const words = normalized.split(" ").filter((w) => w.length >= 6);
  return words.sort((a, b) => b.length - a.length)[0] ?? null;
}

type CandidateGeo = {
  normalizedTitle: string;
  startsAt: Date | null;
  city: string | null;
  country: string | null;
  locationId: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const DAY_MS = 86_400_000;
const FUZZY_WINDOW_MS = 2 * DAY_MS;

function looksLikeDuplicate(
  a: { normalizedTitle: string; startsAt: Date | null; city?: string | null; country?: string | null; locationId?: string | null },
  b: { title: string; startsAt: Date | null; city?: string | null; country?: string | null; locationId?: string | null }
): boolean {
  const bt = normalizeTitle(b.title);
  if (bt && (bt === a.normalizedTitle || (a.normalizedTitle.length >= 10 && bt.includes(a.normalizedTitle)) || (bt.length >= 10 && a.normalizedTitle.includes(bt))))
    return true;
  // Same place + overlapping date window.
  if (a.startsAt && b.startsAt) {
    const samePlace =
      (a.locationId && b.locationId && a.locationId === b.locationId) ||
      (a.city && b.city && norm(a.city) === norm(b.city)) ||
      (!a.city && !b.city && a.country && b.country && norm(a.country) === norm(b.country));
    if (samePlace && Math.abs(a.startsAt.getTime() - b.startsAt.getTime()) <= FUZZY_WINDOW_MS)
      return true;
  }
  return false;
}

// Exact duplicate: identical normalized source URL, same connector+externalId,
// or a public Event already carrying this URL/external identifier.
export async function findExactDuplicate(
  db: PrismaClient,
  c: {
    sourceUrl: string;
    sourceUrlNormalized: string;
    registrationUrl?: string | null;
    connector: string;
    externalId: string | null;
    excludeId?: string;
  }
): Promise<{ eventId?: string; candidateId?: string }> {
  const rawUrls = [c.sourceUrl, c.registrationUrl].filter(
    (u): u is string => !!u
  );
  const [candidate, event] = await Promise.all([
    db.discoveredEvent.findFirst({
      where: {
        ...(c.excludeId ? { id: { not: c.excludeId } } : {}),
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { sourceUrlNormalized: c.sourceUrlNormalized },
          ...(c.externalId
            ? [{ connector: c.connector, externalId: c.externalId }]
            : []),
        ],
      },
      select: { id: true },
    }),
    // Event.url is stored raw (manual entry) — compare the candidate's raw
    // source/registration URLs exactly, plus its external identifier.
    db.event.findFirst({
      where: {
        OR: [
          ...(c.externalId ? [{ externalId: c.externalId }] : []),
          ...(rawUrls.length ? [{ url: { in: rawUrls } }] : []),
        ],
      },
      select: { id: true },
    }),
  ]);
  return { eventId: event?.id, candidateId: candidate?.id };
}

// Possible duplicates surfaced to reviewers — never auto-merged. Scopes the
// DB fetch with cheap predicates, then scores in JS.
export async function findPossibleDuplicates(
  db: PrismaClient,
  c: CandidateGeo & { excludeId?: string }
): Promise<{ events: { id: string; title: string; slug: string }[]; candidates: { id: string; title: string }[] }> {
  const token = keyToken(c.normalizedTitle);
  const near =
    c.startsAt != null
      ? {
          gte: new Date(c.startsAt.getTime() - FUZZY_WINDOW_MS),
          lte: new Date(c.startsAt.getTime() + FUZZY_WINDOW_MS),
        }
      : null;

  const titleOrPlace: Record<string, unknown>[] = [];
  if (token) titleOrPlace.push({ title: { contains: token, mode: "insensitive" } });
  if (near && (c.city || c.country || c.locationId)) {
    titleOrPlace.push({
      AND: [
        { startsAt: near },
        {
          OR: [
            ...(c.locationId ? [{ locationId: c.locationId }] : []),
            ...(c.city ? [{ city: { equals: c.city, mode: "insensitive" } }] : []),
            ...(c.country ? [{ country: { equals: c.country, mode: "insensitive" } }] : []),
          ],
        },
      ],
    });
  }
  if (titleOrPlace.length === 0) return { events: [], candidates: [] };

  const [events, candidates] = await Promise.all([
    db.event.findMany({
      where: { OR: titleOrPlace },
      take: 40,
      select: { id: true, slug: true, title: true, startsAt: true, city: true, country: true, locationId: true },
    }),
    db.discoveredEvent.findMany({
      where: {
        ...(c.excludeId ? { id: { not: c.excludeId } } : {}),
        status: "PENDING",
        OR: titleOrPlace,
      },
      take: 40,
      select: { id: true, title: true, startsAt: true, city: true, country: true, locationId: true },
    }),
  ]);

  return {
    events: events
      .filter((e) => looksLikeDuplicate(c, e))
      .map(({ id, title, slug }) => ({ id, title, slug })),
    candidates: candidates
      .filter((e) => looksLikeDuplicate(c, e))
      .map(({ id, title }) => ({ id, title })),
  };
}
