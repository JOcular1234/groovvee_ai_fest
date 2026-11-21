import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryFeaturedSpeakers,
  queryPublishedSpeakers,
} from "@/lib/speakers";

// Tag-based cache: every speaker mutation calls updateTag("speakers"), so
// public pages stay fast (cacheComponents) but never serve stale drafts.
export const SPEAKERS_CACHE_TAG = "speakers";

async function cachedPublishedSpeakers() {
  "use cache";
  cacheTag(SPEAKERS_CACHE_TAG);
  return queryPublishedSpeakers(db);
}
export async function getPublishedSpeakers() {
  return withDbRetry(cachedPublishedSpeakers);
}

async function cachedFeaturedSpeakers() {
  "use cache";
  cacheTag(SPEAKERS_CACHE_TAG);
  return queryFeaturedSpeakers(db);
}
export async function getFeaturedSpeakers() {
  return withDbRetry(cachedFeaturedSpeakers);
}
