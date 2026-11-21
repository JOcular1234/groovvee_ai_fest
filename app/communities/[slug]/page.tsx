import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "@/components/ui/AppImage";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollageBackground } from "@/components/ui/CollageBackground";
import { getCommunityBySlug } from "@/lib/public/communities";
import { pageMetadata } from "@/lib/site";
import {
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_TYPE_LABELS,
} from "@/lib/validation/community";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) return { title: "Community" };
  return pageMetadata({
    title: community.name,
    description: community.description.slice(0, 160),
    path: `/communities/${community.slug}`,
    image: community.imageUrl,
  });
}

// Dynamic slug params — renders per request over cached queries.
export const instant = false;

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const location = [community.city, community.country]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/communities"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All communities
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              <span className="inline-block size-2 bg-volt" aria-hidden />
              {COMMUNITY_TYPE_LABELS[community.type] ?? community.type}
              {community.category && (
                <span className="text-ink/50">
                  · {COMMUNITY_CATEGORY_LABELS[community.category] ?? community.category}
                </span>
              )}
              {location && <span className="text-ink/50">· {location}</span>}
            </p>
            <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-6xl">
              {community.name}
            </h1>
            <p className="mt-8 whitespace-pre-line border border-ink/15 bg-white/95 p-6 leading-relaxed text-ink/75 backdrop-blur-sm sm:p-8">
              {community.description}
            </p>
            {community.joinUrl && (
              <a
                href={community.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center gap-2 border border-ink bg-ink px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel"
              >
                Join this community
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </div>

          <div className="relative aspect-4/3 self-start overflow-hidden border border-ink/15 bg-ink">
            <div
              className="bg-halftone absolute right-0 top-0 z-10 size-24 opacity-40"
              aria-hidden
            />
            {community.imageUrl ? (
              <Image
                src={community.imageUrl}
                alt={community.name}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
              >
                {community.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
