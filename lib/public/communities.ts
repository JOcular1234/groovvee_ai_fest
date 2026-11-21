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

async function cachedPublishedCommunities(
  opts: { category?: CommunityInput["category"] }
) {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return queryPublishedCommunities(db, opts);
}
export async function getPublishedCommunities(
  opts: { category?: CommunityInput["category"] } = {}
) {
  return withDbRetry(() => cachedPublishedCommunities(opts));
}

async function cachedCommunityBySlug(slug: string) {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return queryCommunityBySlug(db, slug);
}
export async function getCommunityBySlug(slug: string) {
  return withDbRetry(() => cachedCommunityBySlug(slug));
}

async function cachedFeaturedCommunities() {
  "use cache";
  cacheTag(COMMUNITIES_CACHE_TAG);
  return queryFeaturedCommunities(db);
}
export async function getFeaturedCommunities() {
  return withDbRetry(cachedFeaturedCommunities);
}
