import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { zonedToUtc } from "@/lib/datetime";
import { eventGeoFromLocation } from "@/lib/locations";
import {
  isUniqueViolation,
  SlugConflictError,
  uniqueSlug,
} from "@/lib/slug";
import type { EventInput } from "@/lib/validation/event";

export const publishedEventWhere = { published: true } as const;

const publicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  city: true,
  stateProvince: true,
  country: true,
  region: true,
  venueName: true,
  isOnline: true,
  url: true,
  imageUrl: true,
  source: true,
  locationId: true,
  communityId: true,
  community: { select: { name: true, slug: true } },
} satisfies Prisma.EventSelect;

export const ADMIN_EVENTS_PAGE_SIZE = 20;
export const FEATURED_EVENTS_LIMIT = 6;

export type EventSort = "date" | "recent";

export type AdminEventFilters = {
  q?: string;
  page?: number;
  status?: "published" | "draft";
  source?: "GROOVVEE" | "EXTERNAL";
  region?: string;
  country?: string;
  locationId?: string;
  sort?: EventSort;
};

async function slugTaken(
  db: PrismaClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.event.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

const nextSlug = (db: PrismaClient, base: string) =>
  uniqueSlug((s) => slugTaken(db, s), base);

// Converts the form's wall-clock datetimes to UTC instants for storage.
// Returns null when a supplied datetime is invalid for the event timezone.
// When a Location is selected it is authoritative for geography — submitted
// city/stateProvince/country/region are ignored and re-derived server-side.
// Without a location the submitted (legacy) text fields are kept as-is.
async function eventData(db: PrismaClient, input: EventInput) {
  const startsAt = zonedToUtc(input.startsAtLocal, input.timezone);
  const endsAt = input.endsAtLocal
    ? zonedToUtc(input.endsAtLocal, input.timezone)
    : null;
  if (!startsAt || (input.endsAtLocal && !endsAt)) return null;

  let geo = {
    city: input.city,
    stateProvince: input.stateProvince,
    country: input.country,
    region: input.region,
  };
  let locationId: string | null = null;
  if (input.locationId) {
    const location = await db.location.findUnique({
      where: { id: input.locationId },
    });
    if (!location) throw new Error("invalid_location");
    locationId = location.id;
    geo = eventGeoFromLocation(location);
  }

  return {
    title: input.title,
    description: input.description,
    source: input.source,
    externalId: input.externalId,
    timezone: input.timezone,
    ...geo,
    venueName: input.venueName,
    isOnline: input.isOnline,
    url: input.url,
    imageUrl: input.imageUrl,
    locationId,
    communityId: input.communityId,
    featured: input.featured,
    published: input.published,
    sortOrder: input.sortOrder,
    startsAt,
    endsAt,
  };
}

async function communityExists(db: PrismaClient, id: string | null) {
  if (!id) return true;
  const c = await db.community.findUnique({ where: { id }, select: { id: true } });
  return c !== null;
}

export async function listEventsForAdmin(
  db: PrismaClient,
  opts: AdminEventFilters = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.EventWhereInput = {};
  if (opts.q) {
    where.OR = [
      { title: { contains: opts.q, mode: "insensitive" } },
      { city: { contains: opts.q, mode: "insensitive" } },
    ];
  }
  if (opts.status) where.published = opts.status === "published";
  if (opts.source) where.source = opts.source;
  if (opts.region) where.region = opts.region;
  if (opts.country) where.country = opts.country;
  if (opts.locationId) where.locationId = opts.locationId;

  const orderBy: Prisma.EventOrderByWithRelationInput[] =
    opts.sort === "recent"
      ? [{ updatedAt: "desc" }]
      : [{ startsAt: "asc" }, { id: "asc" }];

  const [total, events] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      orderBy,
      skip: (page - 1) * ADMIN_EVENTS_PAGE_SIZE,
      take: ADMIN_EVENTS_PAGE_SIZE,
      include: { community: { select: { name: true } } },
    }),
  ]);

  return {
    events,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_EVENTS_PAGE_SIZE)),
  };
}

export async function listEventFilterOptions(db: PrismaClient) {
  const rows = await db.event.findMany({
    select: { region: true, country: true },
    distinct: ["region", "country"],
  });
  const regions = [...new Set(rows.map((r) => r.region).filter(Boolean))].sort() as string[];
  const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))].sort() as string[];
  return { regions, countries };
}

export async function listCommunitiesForSelect(db: PrismaClient) {
  return db.community.findMany({
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function listEventsForSelect(db: PrismaClient) {
  return db.event.findMany({
    orderBy: [{ startsAt: "desc" }],
    select: { id: true, title: true },
    take: 200,
  });
}

export async function getEventById(db: PrismaClient, id: string) {
  return db.event.findUnique({ where: { id } });
}

export async function createEvent(db: PrismaClient, input: EventInput) {
  const data = await eventData(db, input);
  if (!data) throw new Error("invalid_datetime");
  if (!(await communityExists(db, data.communityId)))
    throw new Error("invalid_community");

  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.title));
  for (let attempt = 0; ; attempt++) {
    if (await slugTaken(db, slug)) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
      continue;
    }
    try {
      return await db.event.create({ data: { ...data, slug } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function updateEvent(
  db: PrismaClient,
  id: string,
  input: EventInput
) {
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) return null;

  const data = await eventData(db, input);
  if (!data) throw new Error("invalid_datetime");
  if (!(await communityExists(db, data.communityId)))
    throw new Error("invalid_community");

  const auto = !input.slug;
  let slug = input.slug || (await nextSlug(db, input.title));
  for (let attempt = 0; ; attempt++) {
    if (slug !== existing.slug && (await slugTaken(db, slug, id))) {
      if (!auto) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
      continue;
    }
    try {
      return await db.event.update({
        where: { id },
        data: { ...data, slug },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!auto || attempt >= 4) throw new SlugConflictError(slug);
      slug = await nextSlug(db, input.title);
    }
  }
}

export async function deleteEvent(db: PrismaClient, id: string) {
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  // agenda_items.eventId and competitions.eventId are SetNull — linked
  // records survive with the relationship cleared.
  await db.event.delete({ where: { id } });
  return true;
}

export async function setEventPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.event.update({ where: { id }, data: { published } });
}

export async function setEventFeatured(
  db: PrismaClient,
  id: string,
  featured: boolean
) {
  const existing = await db.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.event.update({ where: { id }, data: { featured } });
}

export async function moveEvent(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.event.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const index = all.findIndex((e) => e.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((e, i) =>
      db.event.update({ where: { id: e.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Public queries (unpublished events are never returned) ---

export const PUBLIC_EVENTS_PAGE_SIZE = 24;

export type PublicEventFilters = {
  q?: string;
  region?: string;
  country?: string;
  city?: string;
  isOnline?: boolean;
  source?: "GROOVVEE" | "EXTERNAL";
  locationId?: string;
};

function publicWhere(filters: PublicEventFilters = {}): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = { ...publishedEventWhere };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { venueName: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (typeof filters.isOnline === "boolean") where.isOnline = filters.isOnline;
  if (filters.region) where.region = filters.region;
  if (filters.country) where.country = filters.country;
  if (filters.source) where.source = filters.source;
  if (filters.locationId) where.locationId = filters.locationId;
  return where;
}

// Upcoming: soonest first. Past: most recent first. `now` is injectable for tests.
export async function queryPublicEvents(
  db: PrismaClient,
  filters: PublicEventFilters = {},
  when: "upcoming" | "past" = "upcoming",
  page = 1,
  now: Date = new Date()
) {
  const where: Prisma.EventWhereInput = {
    ...publicWhere(filters),
    startsAt: when === "upcoming" ? { gte: now } : { lt: now },
  };
  const orderBy: Prisma.EventOrderByWithRelationInput[] =
    when === "upcoming"
      ? [{ startsAt: "asc" }, { title: "asc" }]
      : [{ startsAt: "desc" }, { title: "asc" }];
  const p = Math.max(1, page);
  const [total, events] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      orderBy,
      skip: (p - 1) * PUBLIC_EVENTS_PAGE_SIZE,
      take: PUBLIC_EVENTS_PAGE_SIZE,
      select: publicSelect,
    }),
  ]);
  return {
    events,
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / PUBLIC_EVENTS_PAGE_SIZE)),
  };
}

// Published events overlapping [from, to). An event overlaps when it starts
// before `to` AND either its endsAt reaches `from`, or it has no endsAt and
// starts inside the range (an instant event occupies its start date only).
// The caller widens `from`/`to` past timezone extremes (see monthFetchRange
// in lib/calendar.ts) and does local-date grouping afterwards.
export async function queryPublicEventsInRange(
  db: PrismaClient,
  from: Date,
  to: Date,
  filters: PublicEventFilters = {}
) {
  return db.event.findMany({
    where: {
      ...publicWhere(filters),
      startsAt: { lt: to },
      OR: [
        { endsAt: { gte: from } },
        { endsAt: null, startsAt: { gte: from } },
      ],
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    select: publicSelect,
  });
}

export async function queryPublicEventFilterOptions(db: PrismaClient) {
  const rows = await db.event.findMany({
    where: publishedEventWhere,
    select: { region: true, country: true },
  });
  const regions = [...new Set(rows.map((r) => r.region).filter(Boolean))].sort() as string[];
  const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))].sort() as string[];
  return { regions, countries };
}

// Featured pick for the directory hero: first featured upcoming event,
// falling back to the next upcoming published event.
export async function queryFeaturedOrNextEvent(
  db: PrismaClient,
  now: Date = new Date()
) {
  const featured = await db.event.findFirst({
    where: { ...publishedEventWhere, featured: true, startsAt: { gte: now } },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
    select: publicSelect,
  });
  if (featured) return featured;
  return db.event.findFirst({
    where: { ...publishedEventWhere, startsAt: { gte: now } },
    orderBy: [{ startsAt: "asc" }],
    select: publicSelect,
  });
}

// Same-community upcoming events first, filled with other upcoming events.
export async function queryRelatedEvents(
  db: PrismaClient,
  event: { id: string; communityId: string | null },
  limit = 3,
  now: Date = new Date()
) {
  const base: Prisma.EventWhereInput = {
    ...publishedEventWhere,
    id: { not: event.id },
    startsAt: { gte: now },
  };
  const picked: string[] = [];
  const out: Prisma.EventGetPayload<{ select: typeof publicSelect }>[] = [];

  if (event.communityId) {
    const same = await db.event.findMany({
      where: { ...base, communityId: event.communityId },
      orderBy: [{ startsAt: "asc" }],
      take: limit,
      select: publicSelect,
    });
    out.push(...same);
    picked.push(...same.map((e) => e.id));
  }
  if (out.length < limit) {
    const rest = await db.event.findMany({
      where: { ...base, id: { notIn: [event.id, ...picked] } },
      orderBy: [{ startsAt: "asc" }],
      take: limit - out.length,
      select: publicSelect,
    });
    out.push(...rest);
  }
  return out;
}

export async function queryPublishedEvents(db: PrismaClient) {
  return db.event.findMany({
    where: publishedEventWhere,
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    select: publicSelect,
  });
}

export async function queryEventBySlug(db: PrismaClient, slug: string) {
  return db.event.findFirst({
    where: { ...publishedEventWhere, slug },
    select: publicSelect,
  });
}

export async function queryFeaturedEvents(db: PrismaClient) {
  return db.event.findMany({
    where: { ...publishedEventWhere, featured: true },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
    take: FEATURED_EVENTS_LIMIT,
    select: publicSelect,
  });
}
