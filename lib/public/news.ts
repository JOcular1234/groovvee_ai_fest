import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryLatestNewsPosts,
  queryNewsPostBySlug,
  queryPublishedNewsPosts,
} from "@/lib/news";

export const NEWS_CACHE_TAG = "news";

export async function getPublishedNewsPosts(page = 1) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  return withDbRetry(() => queryPublishedNewsPosts(db, page));
}

export async function getNewsPostBySlug(slug: string) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  return withDbRetry(() => queryNewsPostBySlug(db, slug));
}

export async function getLatestNewsPosts(excludeId: string, take = 3) {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  return withDbRetry(() => queryLatestNewsPosts(db, excludeId, take));
}
