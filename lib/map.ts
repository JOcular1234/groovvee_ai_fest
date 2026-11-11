import type {
  EventsMapData,
  MapCityDatum,
  MapCountryDatum,
  MapRegionDatum,
} from "@/data/map-regions";
import type { PrismaClient } from "@/lib/generated/prisma/client";

// Aggregated published-event data for the interactive events map.
// All counting is done with groupBy/DISTINCT queries — no full event fetch.
// Linked events take geography from their authoritative Location row;
// legacy events (locationId = null) only contribute country counts when
// their free-text `country` exactly matches a known Location's country name —
// we never guess a country code from an ambiguous string.

type SourceCounts = { total: number; upcoming: number; groovvee: number; external: number };
const empty = (): SourceCounts => ({ total: 0, upcoming: 0, groovvee: 0, external: 0 });

function applySource(bucket: SourceCounts, source: string, n: number) {
  bucket.total += n;
  if (source === "GROOVVEE") bucket.groovvee += n;
  else bucket.external += n;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export async function queryEventsMapData(
  db: PrismaClient,
  now: Date = new Date()
): Promise<EventsMapData> {
  const [
    locAll,
    locUp,
    legacyCountryAll,
    legacyCountryUp,
    legacyRegionAll,
    legacyRegionUp,
    nextUp,
    locations,
  ] = await Promise.all([
    db.event.groupBy({
      by: ["locationId", "source"],
      where: { published: true, locationId: { not: null } },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["locationId", "source"],
      where: { published: true, locationId: { not: null }, startsAt: { gte: now } },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["country", "source"],
      where: { published: true, locationId: null },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["country", "source"],
      where: { published: true, locationId: null, startsAt: { gte: now } },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["region", "source"],
      where: { published: true, locationId: null },
      _count: { _all: true },
    }),
    db.event.groupBy({
      by: ["region", "source"],
      where: { published: true, locationId: null, startsAt: { gte: now } },
      _count: { _all: true },
    }),
    db.event.findMany({
      where: { published: true, locationId: { not: null }, startsAt: { gte: now } },
      orderBy: [{ startsAt: "asc" }],
      distinct: ["locationId"],
      select: {
        locationId: true,
        slug: true,
        title: true,
        startsAt: true,
        timezone: true,
      },
    }),
    db.location.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        stateProvince: true,
        country: true,
        countryCode: true,
        region: true,
        latitude: true,
        longitude: true,
      },
    }),
  ]);

  // country name → countryCode, from the Location registry (authoritative).
  const codeByCountryName = new Map<string, string>();
  for (const l of locations) {
    if (!codeByCountryName.has(norm(l.country))) {
      codeByCountryName.set(norm(l.country), l.countryCode);
    }
  }

  // Per-location buckets (linked events).
  const perLoc = new Map<string, SourceCounts>();
  const locBucket = (id: string) => {
    let b = perLoc.get(id);
    if (!b) perLoc.set(id, (b = empty()));
    return b;
  };
  for (const r of locAll) applySource(locBucket(r.locationId as string), r.source, r._count._all);
  for (const r of locUp) locBucket(r.locationId as string).upcoming += r._count._all;

  // Country buckets keyed by countryCode.
  const perCountry = new Map<string, MapCountryDatum>();
  const countryBucket = (cc: string, country: string, region: string) => {
    let b = perCountry.get(cc);
    if (!b) {
      b = {
        countryCode: cc,
        country,
        region,
        publishedCount: 0,
        upcomingCount: 0,
        groovveeCount: 0,
        externalCount: 0,
      };
      perCountry.set(cc, b);
    }
    return b;
  };
  for (const l of locations) {
    const c = perLoc.get(l.id);
    if (!c) continue;
    const b = countryBucket(l.countryCode, l.country, l.region);
    b.publishedCount += c.total;
    b.upcomingCount += c.upcoming;
    b.groovveeCount += c.groovvee;
    b.externalCount += c.external;
  }

  // Legacy unlinked events: country text must match a known Location country
  // name to earn a code; otherwise it's counted but excluded from the map.
  // A matched code reuses the country/region labels already in the bucket;
  // if no linked events seeded the bucket yet, look the labels up.
  let unmatchedCountryEvents = 0;
  for (const r of legacyCountryAll) {
    // Events with no country at all (e.g. online-only) carry no geography —
    // they are excluded from country aggregation, not counted as unmatched.
    if (!r.country) continue;
    const cc = codeByCountryName.get(norm(r.country));
    if (!cc) {
      unmatchedCountryEvents += r._count._all;
      continue;
    }
    const l = locations.find((x) => x.countryCode === cc)!;
    const b = countryBucket(cc, l.country, l.region);
    b.publishedCount += r._count._all;
    if (r.source === "GROOVVEE") b.groovveeCount += r._count._all;
    else b.externalCount += r._count._all;
  }
  for (const r of legacyCountryUp) {
    const cc = codeByCountryName.get(norm(r.country));
    if (!cc) continue;
    perCountry.get(cc)!.upcomingCount += r._count._all;
  }

  // Region buckets: linked via Location.region, legacy via Event.region text.
  const perRegion = new Map<string, MapRegionDatum>();
  const regionBucket = (region: string) => {
    let b = perRegion.get(region);
    if (!b) {
      b = { region, publishedCount: 0, upcomingCount: 0, groovveeCount: 0, externalCount: 0 };
      perRegion.set(region, b);
    }
    return b;
  };
  for (const l of locations) {
    const c = perLoc.get(l.id);
    if (!c) continue;
    const b = regionBucket(l.region);
    b.publishedCount += c.total;
    b.upcomingCount += c.upcoming;
    b.groovveeCount += c.groovvee;
    b.externalCount += c.external;
  }
  for (const r of legacyRegionAll) {
    if (!r.region) continue;
    const b = regionBucket(r.region);
    b.publishedCount += r._count._all;
    if (r.source === "GROOVVEE") b.groovveeCount += r._count._all;
    else b.externalCount += r._count._all;
  }
  for (const r of legacyRegionUp) {
    if (!r.region) continue;
    regionBucket(r.region).upcomingCount += r._count._all;
  }

  const nextByLoc = new Map(nextUp.map((e) => [e.locationId as string, e]));

  const cities: MapCityDatum[] = locations
    .filter((l) => l.type === "CITY" && (perLoc.get(l.id)?.total ?? 0) > 0)
    .map((l) => {
      const c = perLoc.get(l.id)!;
      const next = nextByLoc.get(l.id);
      return {
        slug: l.slug,
        name: l.name,
        stateProvince: l.stateProvince,
        country: l.country,
        countryCode: l.countryCode,
        region: l.region,
        latitude: l.latitude,
        longitude: l.longitude,
        publishedCount: c.total,
        upcomingCount: c.upcoming,
        groovveeCount: c.groovvee,
        externalCount: c.external,
        nextUpcoming: next
          ? {
              slug: next.slug,
              title: next.title,
              startsAt: next.startsAt.toISOString(),
              timezone: next.timezone,
            }
          : null,
      };
    })
    .sort((a, b) => b.publishedCount - a.publishedCount || a.name.localeCompare(b.name));

  return {
    countries: [...perCountry.values()].sort(
      (a, b) => b.publishedCount - a.publishedCount || a.country.localeCompare(b.country)
    ),
    cities,
    regions: [...perRegion.values()].sort(
      (a, b) => b.publishedCount - a.publishedCount || a.region.localeCompare(b.region)
    ),
    unmatchedCountryEvents,
  };
}
