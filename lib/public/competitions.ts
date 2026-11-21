import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryCompetitionBySlug,
  queryHackWarsCompetition,
  queryPublishedCompetitions,
} from "@/lib/competitions";

export const COMPETITIONS_CACHE_TAG = "competitions";

async function cachedPublishedCompetitions() {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return queryPublishedCompetitions(db);
}
export async function getPublishedCompetitions() {
  return withDbRetry(cachedPublishedCompetitions);
}

async function cachedCompetitionBySlug(slug: string) {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return queryCompetitionBySlug(db, slug);
}
export async function getCompetitionBySlug(slug: string) {
  return withDbRetry(() => cachedCompetitionBySlug(slug));
}

async function cachedHackWarsCompetition() {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return queryHackWarsCompetition(db);
}
export async function getHackWarsCompetition() {
  return withDbRetry(cachedHackWarsCompetition);
}
