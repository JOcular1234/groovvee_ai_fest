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

// Each getter splits in two: a private "use cache" function holding the
// query, and the exported wrapper applying withDbRetry around it. The retry
// backoff awaits a setTimeout promise, which "use cache" forbids inside a
// cached function ("awaiting a promise created outside it").

async function cachedPublishedEvents() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryPublishedEvents(db);
}
export async function getPublishedEvents() {
  return withDbRetry(cachedPublishedEvents);
}

async function cachedEventBySlug(slug: string) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryEventBySlug(db, slug);
}
export async function getEventBySlug(slug: string) {
  return withDbRetry(() => cachedEventBySlug(slug));
}

async function cachedFeaturedEvents() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryFeaturedEvents(db);
}
export async function getFeaturedEvents() {
  return withDbRetry(cachedFeaturedEvents);
}

async function cachedPublicEvents(
  filters: PublicEventFilters,
  when: "upcoming" | "past",
  page: number
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryPublicEvents(db, filters, when, page);
}
export async function getPublicEvents(
  filters: PublicEventFilters = {},
  when: "upcoming" | "past" = "upcoming",
  page = 1
) {
  return withDbRetry(() => cachedPublicEvents(filters, when, page));
}

async function cachedPublicEventsInRange(
  from: Date,
  to: Date,
  filters: PublicEventFilters
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryPublicEventsInRange(db, from, to, filters);
}
export async function getPublicEventsInRange(
  from: Date,
  to: Date,
  filters: PublicEventFilters = {}
) {
  return withDbRetry(() => cachedPublicEventsInRange(from, to, filters));
}

async function cachedPublicEventFilterOptions() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryPublicEventFilterOptions(db);
}
export async function getPublicEventFilterOptions() {
  return withDbRetry(cachedPublicEventFilterOptions);
}

async function cachedFeaturedOrNextEvent() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryFeaturedOrNextEvent(db);
}
export async function getFeaturedOrNextEvent() {
  return withDbRetry(cachedFeaturedOrNextEvent);
}

async function cachedRelatedEvents(
  event: { id: string; communityId: string | null },
  limit: number
) {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  return queryRelatedEvents(db, event, limit);
}
export async function getRelatedEvents(
  event: { id: string; communityId: string | null },
  limit = 3
) {
  return withDbRetry(() => cachedRelatedEvents(event, limit));
}
