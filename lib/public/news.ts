import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryLatestNewsPosts,
  queryNewsPostBySlug,
  queryNewsTags,
  queryPublishedNewsPosts,
} from "@/lib/news";

export const NEWS_CACHE_TAG = "news";

// cacheLife("minutes"): visibility depends on the current time (scheduled
// posts), so entries must expire on their own — a scheduled post goes live
// within a few minutes of its publish time without any admin action.

export async function getPublishedNewsPosts(page = 1, tag?: string) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return withDbRetry(() => queryPublishedNewsPosts(db, { page, tag }));
}

export async function getNewsTags() {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return withDbRetry(() => queryNewsTags(db));
}

export async function getNewsPostBySlug(slug: string) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return withDbRetry(() => queryNewsPostBySlug(db, slug));
}

export async function getLatestNewsPosts(excludeId: string, take = 3) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return withDbRetry(() => queryLatestNewsPosts(db, excludeId, take));
}
