import "server-only";

import { cacheTag } from "next/cache";

import { db, withDbRetry } from "@/lib/db";
import { queryEventProgramme } from "@/lib/agenda";

export const AGENDA_CACHE_TAG = "agenda";

export async function getEventProgramme(eventId: string) {
  "use cache";
  cacheTag(AGENDA_CACHE_TAG);
  return withDbRetry(() => queryEventProgramme(db, eventId));
}
