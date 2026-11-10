import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import { queryHomepageTopics, queryPublishedTopics } from "@/lib/topics";

export const TOPICS_CACHE_TAG = "topics";

export async function getPublishedTopics() {
  "use cache";
  cacheTag(TOPICS_CACHE_TAG);
  return withDbRetry(() => queryPublishedTopics(db));
}

export async function getHomepageTopics() {
  "use cache";
  cacheTag(TOPICS_CACHE_TAG);
  return withDbRetry(() => queryHomepageTopics(db));
}
