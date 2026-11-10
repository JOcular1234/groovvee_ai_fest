import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryCommunityBySlug,
  queryFeaturedCommunities,
  queryPublishedCommunities,
} from "@/lib/communities";

export const COMMUNITIES_CACHE_TAG = "communities";

export async function getPublishedCommunities() {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return withDbRetry(() => queryPublishedCommunities(db));
}

export async function getCommunityBySlug(slug: string) {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return withDbRetry(() => queryCommunityBySlug(db, slug));
}

export async function getFeaturedCommunities() {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return withDbRetry(() => queryFeaturedCommunities(db));
}
