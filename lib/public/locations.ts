import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import { queryCityBySlug, queryCityIndex } from "@/lib/locations";
import { queryEventsMapData } from "@/lib/map";
import { EVENTS_CACHE_TAG } from "@/lib/public/events";

export const LOCATIONS_CACHE_TAG = "locations";

// The city index reads both locations and published-event counts, so it is
// tagged with both: event mutations revalidate "events" (existing
// convention), location seeds/changes revalidate "locations".
export async function getCityIndex(
  filters: { q?: string; region?: string; country?: string } = {}
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  cacheTag(LOCATIONS_CACHE_TAG);
  return withDbRetry(() => queryCityIndex(db, filters));
}

export async function getCityBySlug(slug: string) {
  "use cache";
  cacheTag(LOCATIONS_CACHE_TAG);
  return withDbRetry(() => queryCityBySlug(db, slug));
}

// Map aggregates combine locations and published events — both tags, same
// convention as the city index.
export async function getEventsMapData() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  cacheTag(LOCATIONS_CACHE_TAG);
  return withDbRetry(() => queryEventsMapData(db));
}
