import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/lib/public/sitemap";
import { absoluteUrl } from "@/lib/site";

const STATIC_ROUTES = [
  "/",
  "/about",
  "/events",
  "/events/cities",
  "/communities",
  "/competitions",
  "/hack-wars",
  "/hack-wars/apply",
  "/speakers",
  "/speakers/apply",
  "/topics",
  "/tickets",
  "/partnerships",
  "/news",
  "/contact",
  "/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { events, communities, competitions, news, cities } =
    await getSitemapEntries();

  const detail = (prefix: string, rows: { slug: string; updatedAt: Date }[]) =>
    rows.map((r) => ({
      url: absoluteUrl(`${prefix}/${r.slug}`),
      lastModified: r.updatedAt,
    }));

  return [
    ...STATIC_ROUTES.map((path) => ({ url: absoluteUrl(path) })),
    ...detail("/events", events),
    ...detail("/events/cities", cities),
    ...detail("/communities", communities),
    ...detail("/competitions", competitions),
    ...detail("/news", news),
  ];
}
