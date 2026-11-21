import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import { queryHomepageTopics, queryPublishedTopics } from "@/lib/topics";

export const TOPICS_CACHE_TAG = "topics";

async function cachedPublishedTopics() {
  "use cache";
  cacheTag(TOPICS_CACHE_TAG);
  return queryPublishedTopics(db);
}
export async function getPublishedTopics() {
  return withDbRetry(cachedPublishedTopics);
}

async function cachedHomepageTopics() {
  "use cache";
  cacheTag(TOPICS_CACHE_TAG);
  return queryHomepageTopics(db);
}
export async function getHomepageTopics() {
  return withDbRetry(cachedHomepageTopics);
}
