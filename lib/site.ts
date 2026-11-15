import type { Metadata } from "next";

import { event } from "@/data/event";

// Canonical public origin for metadata (metadataBase, sitemap, robots,
// JSON-LD). Unlike the email helper this never throws, so builds without
// SITE_URL still succeed — Vercel's production domain is the fallback.
export function getSiteUrl(): string {
  const explicit = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export const SITE_NAME = event.name;

// The branded card from app/opengraph-image.tsx. Pages that set their own
// `openGraph` replace the inherited one entirely, so they must list this
// explicitly or they'd share with no image.
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${event.name} — Where Creativity Meets Artificial Intelligence`,
};

// Per-page metadata with canonical URL and a complete Open Graph block, so
// shares show the page's own title/description instead of the homepage's.
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url: path,
      type,
      siteName: SITE_NAME,
      images: [image ? { url: image } : DEFAULT_OG_IMAGE],
    },
  };
}
