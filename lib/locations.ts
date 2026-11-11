import type { PrismaClient } from "@/lib/generated/prisma/client";
import { slugify } from "@/lib/slug";
import type { LocationSeed } from "@/lib/validation/location";

type LocationGeo = {
  name: string;
  type: string;
  stateProvince: string;
  country: string;
  region: string;
};

// Deterministic slugs so seeds are stable and idempotent:
//   cities   → "minneapolis-minnesota-us", "lagos-ng"
//   country  → "morocco"
// The state segment is skipped when it duplicates the city name (Lagos).
export function locationSlug(seed: {
  name: string;
  type: string;
  stateProvince?: string;
  countryCode: string;
}) {
  if (seed.type === "COUNTRY_FALLBACK") {
    return `country-${slugify(seed.name)}`;
  }
  const mid =
    seed.stateProvince && seed.stateProvince !== seed.name
      ? `-${seed.stateProvince}`
      : "";
  return slugify(`${seed.name}${mid}-${seed.countryCode}`);
}

// Human label with enough context to disambiguate same-named cities.
//   "Minneapolis, Minnesota, United States"
//   "Morocco (countrywide)"
export function locationLabel(
  l: Pick<LocationGeo, "name" | "type" | "stateProvince" | "country">
) {
  if (l.type === "COUNTRY_FALLBACK") return `${l.country} (countrywide)`;
  const parts = [l.name, l.stateProvince !== l.name ? l.stateProvince : "", l.country];
  return parts.filter(Boolean).join(", ");
}

// Denormalized geography written onto Event rows so legacy text fields stay
// synchronized with the authoritative Location row.
// CITY → city = location name. COUNTRY_FALLBACK → city stays null: a country
// is never stored in the city field.
export function eventGeoFromLocation(l: LocationGeo) {
  if (l.type === "COUNTRY_FALLBACK") {
    return { city: null, stateProvince: null, country: l.country, region: l.region };
  }
  return {
    city: l.name,
    stateProvince: l.stateProvince || null,
    country: l.country,
    region: l.region,
  };
}

export function listLocationsForSelect(db: PrismaClient) {
  return db.location.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      stateProvince: true,
      country: true,
      countryCode: true,
      region: true,
    },
  });
}

export function getLocationById(db: PrismaClient, id: string) {
  return db.location.findUnique({ where: { id } });
}

export function getLocationBySlug(db: PrismaClient, slug: string) {
  return db.location.findUnique({ where: { slug } });
}

// Idempotent upsert keyed on the deterministic slug — safe to re-run.
export async function upsertLocationSeed(db: PrismaClient, seed: LocationSeed) {
  const slug = locationSlug(seed);
  const data = {
    name: seed.name,
    type: seed.type,
    stateProvince: seed.stateProvince,
    country: seed.country,
    countryCode: seed.countryCode,
    region: seed.region,
    latitude: seed.latitude,
    longitude: seed.longitude,
    timezone: seed.timezone || null,
  };
  return db.location.upsert({ where: { slug }, create: { ...data, slug }, update: data });
}

// --- City discovery queries (public, published events only) ---

export type CityIndexEntry = {
  id: string;
  name: string;
  slug: string;
  type: string;
  stateProvince: string;
  country: string;
  countryCode: string;
  region: string;
  publishedCount: number;
  upcomingCount: number;
};

export type CityIndexResult = {
  cities: CityIndexEntry[];
  regions: string[];
  countries: string[];
};

// CITY locations that host at least one published event, with aggregated
// counts. Counts come from two groupBy aggregations (no N+1, no row
// transfer). The remaining q/region/country filtering is applied in memory —
// the candidate set is the small launch-location list, and the unfiltered
// set doubles as the source for filter options.
// COUNTRY_FALLBACK rows are never included: a country is not a city.
export async function queryCityIndex(
  db: PrismaClient,
  filters: { q?: string; region?: string; country?: string } = {},
  now: Date = new Date()
): Promise<CityIndexResult> {
  const [pubCounts, upCounts] = await Promise.all([
    db.event.groupBy({
      by: ["locationId"],
      where: { published: true, locationId: { not: null } },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["locationId"],
      where: { published: true, locationId: { not: null }, startsAt: { gte: now } },
      _count: { _all: true },
    }),
  ]);
  const pub = new Map(pubCounts.map((r) => [r.locationId as string, r._count._all]));
  const up = new Map(upCounts.map((r) => [r.locationId as string, r._count._all]));

  const rows = await db.location.findMany({
    where: { type: "CITY", id: { in: [...pub.keys()] } },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      stateProvince: true,
      country: true,
      countryCode: true,
      region: true,
    },
  });

  const all = rows.map((c) => ({
    ...c,
    publishedCount: pub.get(c.id) ?? 0,
    upcomingCount: up.get(c.id) ?? 0,
  }));
  const regions = [...new Set(all.map((c) => c.region))].sort();
  const countries = [...new Set(all.map((c) => c.country))].sort();

  const q = (filters.q ?? "").trim().toLowerCase();
  const cities = all.filter((c) => {
    if (filters.region && c.region !== filters.region) return false;
    if (filters.country && c.country !== filters.country) return false;
    if (
      q &&
      !`${c.name} ${c.stateProvince} ${c.country}`.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
  return { cities, regions, countries };
}

// Only CITY locations resolve — fallbacks return null so callers 404.
export async function queryCityBySlug(db: PrismaClient, slug: string) {
  const loc = await db.location.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      stateProvince: true,
      country: true,
      countryCode: true,
      region: true,
      timezone: true,
    },
  });
  return loc?.type === "CITY" ? loc : null;
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

// Links unlinked events whose text city+country match a CITY location, and
// re-synchronizes their denormalized geography. Fallback locations never
// match — they must be assigned explicitly.
export async function backfillEventLocations(db: PrismaClient) {
  const [events, locations] = await Promise.all([
    db.event.findMany({
      where: { locationId: null, city: { not: null } },
      select: { id: true, city: true, country: true },
    }),
    db.location.findMany({ where: { type: "CITY" } }),
  ]);
  const byKey = new Map(
    locations.map((l) => [`${norm(l.name)}|${norm(l.country)}`, l])
  );
  const linked: { id: string; location: string }[] = [];
  for (const e of events) {
    const loc = byKey.get(`${norm(e.city)}|${norm(e.country)}`);
    if (!loc) continue;
    await db.event.update({
      where: { id: e.id },
      data: { locationId: loc.id, ...eventGeoFromLocation(loc) },
    });
    linked.push({ id: e.id, location: locationLabel(loc) });
  }
  return linked;
}
