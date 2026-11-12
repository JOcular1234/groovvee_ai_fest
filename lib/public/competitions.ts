import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import {
  queryCompetitionBySlug,
  queryHackWarsCompetition,
  queryPublishedCompetitions,
} from "@/lib/competitions";

export const COMPETITIONS_CACHE_TAG = "competitions";

export async function getPublishedCompetitions() {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return withDbRetry(() => queryPublishedCompetitions(db));
}

export async function getCompetitionBySlug(slug: string) {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return withDbRetry(() => queryCompetitionBySlug(db, slug));
}

export async function getHackWarsCompetition() {
  "use cache";
  cacheTag(COMPETITIONS_CACHE_TAG);
  return withDbRetry(() => queryHackWarsCompetition(db));
}
