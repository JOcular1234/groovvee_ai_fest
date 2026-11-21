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
// Split pattern: cached query inside, withDbRetry wrapper outside — its
// setTimeout backoff can't be awaited inside "use cache".

async function cachedPublishedNewsPosts(page: number, tag?: string) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return queryPublishedNewsPosts(db, { page, tag });
}
export async function getPublishedNewsPosts(page = 1, tag?: string) {
  return withDbRetry(() => cachedPublishedNewsPosts(page, tag));
}

async function cachedNewsTags() {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return queryNewsTags(db);
}
export async function getNewsTags() {
  return withDbRetry(cachedNewsTags);
}

async function cachedNewsPostBySlug(slug: string) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return queryNewsPostBySlug(db, slug);
}
export async function getNewsPostBySlug(slug: string) {
  return withDbRetry(() => cachedNewsPostBySlug(slug));
}

async function cachedLatestNewsPosts(excludeId: string, take: number) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");
  return queryLatestNewsPosts(db, excludeId, take);
}
export async function getLatestNewsPosts(excludeId: string, take = 3) {
  return withDbRetry(() => cachedLatestNewsPosts(excludeId, take));
}
