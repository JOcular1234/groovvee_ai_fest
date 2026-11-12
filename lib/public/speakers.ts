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

export async function getPublishedSpeakers() {
  "use cache";
  cacheTag(SPEAKERS_CACHE_TAG);
  return withDbRetry(() => queryPublishedSpeakers(db));
}

export async function getFeaturedSpeakers() {
  "use cache";
  cacheTag(SPEAKERS_CACHE_TAG);
  return withDbRetry(() => queryFeaturedSpeakers(db));
}
