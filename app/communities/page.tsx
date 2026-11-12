import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowUpRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EventsMapLazy } from "@/components/events/EventsMapLazy";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedCommunities } from "@/lib/public/communities";
import { getEventsMapData } from "@/lib/public/locations";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_TYPE_LABELS,
  COMMUNITY_TYPE_PLURALS,
  COMMUNITY_TYPES,
  isCommunityCategory,
} from "@/lib/validation/community";

export const metadata: Metadata = {
  title: "Communities",
  description:
    "AI student tribes, campus communities and creative & industry AI groups — find your people in the GrooVVee ecosystem.",
};

// Filtered via searchParams; the heatmap's upcoming counts depend on now.
export const instant = false;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const chipBase = `shrink-0 border px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${focusRing}`;
const chipOn = "border-volt bg-volt text-ink";
const chipOff = "border-white/15 text-white/80 hover:border-volt hover:text-volt";

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await connection();
  const { category: rawCategory } = await searchParams;
  const category = isCommunityCategory(rawCategory) ? rawCategory : undefined;

  const [communities, mapData] = await Promise.all([
    getPublishedCommunities({ category }),
    getEventsMapData(),
  ]);

  const grouped = COMMUNITY_TYPES.map((t) => ({
    ...t,
    communities: communities.filter((c) => c.type === t.value),
  })).filter((g) => g.communities.length > 0);

  const countryCount = new Set(
    communities.map((c) => c.country).filter(Boolean),
  ).size;

  return (
    // overflow-x-clip (not hidden) so the sticky filter bar can still stick
    <section className="relative overflow-x-clip pt-32 pb-24 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />

      {/* Hero */}
      <header className="relative w-full px-5 sm:px-10 2xl:px-16">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Find your people
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Communities<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          Student tribes, campus communities, creative AI groups and industry
          circles — a home for every kind of builder in the Groovvee ecosystem.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link
            href="#heatmap"
            className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-volt ${focusRing}`}
          >
            See where we gather
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      {/* Sticky filter bar — chips are plain links, so filtering needs no JS */}
      <div className="sticky top-16 z-30 mt-12 border-y border-white/10 bg-ink/90 backdrop-blur-md sm:top-20">
        <div className="flex w-full flex-col gap-3 px-5 py-3 sm:px-10 lg:flex-row lg:items-center lg:justify-between 2xl:px-16">
          <nav
            aria-label="Filter by group"
            className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <Link
              href="/communities"
              scroll={false}
              aria-current={!category ? "true" : undefined}
              className={`${chipBase} snap-start ${!category ? chipOn : chipOff}`}
            >
              All
            </Link>
            {COMMUNITY_CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <Link
                  key={c.value}
                  href={`/communities?category=${c.value}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`${chipBase} snap-start ${active ? chipOn : chipOff}`}
                >
                  {c.label}
                </Link>
              );
            })}
          </nav>

          <p
            role="status"
            aria-live="polite"
            className="shrink-0 text-sm text-muted"
          >
            {communities.length}{" "}
            {communities.length === 1 ? "community" : "communities"}
            {countryCount > 1 && <> across {countryCount} countries</>}
          </p>
        </div>
      </div>

      <div className="relative w-full px-5 sm:px-10 2xl:px-16">
        {grouped.length === 0 ? (
          <div className="mt-16 border border-white/10 bg-panel p-8 text-center sm:p-12">
            <p className="font-display text-3xl uppercase">
              {category ? "Nothing here yet" : "Launching soon"}
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              {category
                ? `No communities in ${COMMUNITY_CATEGORY_LABELS[category]} yet. Check back soon or browse every group.`
                : "Community pages are being set up. Check back soon to find your tribe."}
            </p>
            {category && (
              <Link
                href="/communities"
                className={`mt-8 inline-flex items-center gap-1.5 bg-volt px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`}
              >
                Browse all communities
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <section
              key={group.value}
              aria-labelledby={`type-${group.value}`}
              className="mt-14 sm:mt-16"
            >
              <div className="flex items-baseline gap-4">
                <h2
                  id={`type-${group.value}`}
                  className="font-display text-3xl uppercase leading-none sm:text-4xl"
                >
                  {COMMUNITY_TYPE_PLURALS[group.value] ?? `${group.label}s`}
                </h2>
                <span className="font-mono text-xs text-muted">
                  {group.communities.length}
                </span>
                <span className="h-px flex-1 bg-white/10" aria-hidden />
              </div>

              <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {group.communities.map((c, i) => {
                  const location = [c.city, c.country]
                    .filter(Boolean)
                    .join(", ");
                  const label =
                    (c.category && COMMUNITY_CATEGORY_LABELS[c.category]) ??
                    COMMUNITY_TYPE_LABELS[c.type] ??
                    c.type;

                  return (
                    <li key={c.id}>
                      <Reveal delay={0.06 * (i % 3)} className="h-full">
                        <Link
                          href={`/communities/${c.slug}`}
                          className={`group flex h-full flex-col border border-white/10 bg-panel transition-colors hover:border-volt/60 ${focusRing}`}
                        >
                          <div className="relative aspect-video overflow-hidden bg-ink">
                            <div
                              className="bg-halftone absolute right-0 top-0 z-10 size-20 opacity-40"
                              aria-hidden
                            />
                            {c.imageUrl ? (
                              <Image
                                src={c.imageUrl}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="absolute inset-0 flex items-center justify-center font-display text-6xl text-outline-volt"
                              >
                                {c.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="absolute bottom-0 left-0 z-10 bg-volt px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
                              {label}
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col p-5 sm:p-6">
                            <h3 className="font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt">
                              {c.name}
                            </h3>
                            {location && (
                              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/70">
                                <MapPin
                                  className="size-3.5 shrink-0 text-volt"
                                  aria-hidden
                                />
                                {location}
                              </p>
                            )}
                            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                              {c.description}
                            </p>
                            <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 transition-colors group-hover:text-volt [&:not(:first-child)]:mt-6">
                              View community
                              <ArrowUpRight
                                className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                aria-hidden
                              />
                            </span>
                          </div>
                        </Link>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {/* Campus heatmap — monthly community activity across regions */}
        <section
          id="heatmap"
          aria-labelledby="heatmap-title"
          className="mt-24 scroll-mt-40 border-t border-white/10 pt-16"
        >
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            Campus heatmap
          </p>
          <h2
            id="heatmap-title"
            className="mt-5 font-display text-4xl uppercase leading-none sm:text-5xl"
          >
            Where the community gathers<span className="text-volt">.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-muted">
            Monthly events, hackathons and education sessions across campus
            communities in the US and Africa. Hover a country or tap a city to
            see what&apos;s on.
          </p>
          <EventsMapLazy data={mapData} />
        </section>
      </div>
    </section>
  );
}