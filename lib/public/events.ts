import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryEventBySlug,
  queryFeaturedEvents,
  queryFeaturedOrNextEvent,
  queryPublicEventFilterOptions,
  queryPublicEvents,
  queryPublicEventsInRange,
  queryPublishedEvents,
  queryRelatedEvents,
  type PublicEventFilters,
} from "@/lib/events";

export const EVENTS_CACHE_TAG = "events";

export async function getPublishedEvents() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryPublishedEvents(db));
}

export async function getEventBySlug(slug: string) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryEventBySlug(db, slug));
}

export async function getFeaturedEvents() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryFeaturedEvents(db));
}

export async function getPublicEvents(
  filters: PublicEventFilters = {},
  when: "upcoming" | "past" = "upcoming",
  page = 1
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryPublicEvents(db, filters, when, page));
}

export async function getPublicEventsInRange(
  from: Date,
  to: Date,
  filters: PublicEventFilters = {}
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryPublicEventsInRange(db, from, to, filters));
}

export async function getPublicEventFilterOptions() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryPublicEventFilterOptions(db));
}

export async function getFeaturedOrNextEvent() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryFeaturedOrNextEvent(db));
}

export async function getRelatedEvents(
  event: { id: string; communityId: string | null },
  limit = 3
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return withDbRetry(() => queryRelatedEvents(db, event, limit));
}
