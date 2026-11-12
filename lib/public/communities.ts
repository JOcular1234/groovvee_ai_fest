import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryCommunityBySlug,
  queryFeaturedCommunities,
  queryPublishedCommunities,
} from "@/lib/communities";
import type { CommunityInput } from "@/lib/validation/community";

export const COMMUNITIES_CACHE_TAG = "communities";

export async function getPublishedCommunities(
  opts: { category?: CommunityInput["category"] } = {}
) {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return withDbRetry(() => queryPublishedCommunities(db, opts));
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
