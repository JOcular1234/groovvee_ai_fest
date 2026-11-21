import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { publishedCommunityWhere } from "@/lib/communities";
import { publishedCompetitionWhere } from "@/lib/competitions";
import { db, withDbRetry } from "@/lib/db";
import { publishedEventWhere } from "@/lib/events";
import { liveNewsPostWhere } from "@/lib/news";
import { COMMUNITIES_CACHE_TAG } from "@/lib/public/communities";
import { COMPETITIONS_CACHE_TAG } from "@/lib/public/competitions";
import { EVENTS_CACHE_TAG } from "@/lib/public/events";
import { LOCATIONS_CACHE_TAG } from "@/lib/public/locations";
import { NEWS_CACHE_TAG } from "@/lib/public/news";

const entry = { slug: true, updatedAt: true } as const;

// Slugs + last-modified for every published detail page. Tagged with each
// content tag so existing revalidateTag calls keep the sitemap fresh.
async function cachedSitemapEntries() {
  "use cache";
  cacheTag(EVENTS_CACHE_TAG);
  cacheTag(COMMUNITIES_CACHE_TAG);
  cacheTag(COMPETITIONS_CACHE_TAG);
  cacheTag(NEWS_CACHE_TAG);
  cacheTag(LOCATIONS_CACHE_TAG);
  // Scheduled news posts must appear once their publish time passes.
  cacheLife("hours");
  const [events, communities, competitions, news, cities] = await Promise.all([
    db.event.findMany({ where: publishedEventWhere, select: entry }),
    db.community.findMany({ where: publishedCommunityWhere, select: entry }),
    db.competition.findMany({ where: publishedCompetitionWhere, select: entry }),
    db.newsPost.findMany({ where: liveNewsPostWhere(), select: entry }),
    db.location.findMany({
      where: { type: "CITY", events: { some: publishedEventWhere } },
      select: entry,
    }),
  ]);
  return { events, communities, competitions, news, cities };
}
export async function getSitemapEntries() {
  return withDbRetry(cachedSitemapEntries);
}
