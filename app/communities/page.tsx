import type { Metadata } from "next";
import { connection } from "next/server";
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

const selectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

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

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
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

        <form action="/communities" className="mt-12 flex flex-wrap items-end gap-2">
          <select
            name="category"
            defaultValue={category ?? ""}
            className={selectClass}
            aria-label="Filter by group"
          >
            <option value="">All creative &amp; industry groups</option>
            {COMMUNITY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
          {category && (
            <Link
              href="/communities"
              className="px-2 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
            >
              Clear
            </Link>
          )}
        </form>

        {grouped.length === 0 ? (
          <div className="mt-16 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {category ? "Nothing here yet" : "Launching soon"}
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              {category
                ? `No communities in ${COMMUNITY_CATEGORY_LABELS[category]} yet — check back soon or explore another group.`
                : "Community pages are being set up. Check back soon to find your tribe."}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.value} className="mt-16">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                {COMMUNITY_TYPE_PLURALS[group.value] ?? `${group.label}s`}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.communities.map((c, i) => (
                  <Reveal key={c.id} delay={0.06 * (i % 3)}>
                    <Link
                      href={`/communities/${c.slug}`}
                      className="group flex h-full flex-col border border-white/10 bg-panel transition-colors hover:border-volt/60"
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
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                          {(c.category &&
                            COMMUNITY_CATEGORY_LABELS[c.category]) ??
                            COMMUNITY_TYPE_LABELS[c.type] ??
                            c.type}
                          {(c.city || c.country) && (
                            <span className="text-muted">
                              {" "}
                              · {[c.city, c.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </p>
                        <h2 className="mt-3 font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt">
                          {c.name}
                        </h2>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                          {c.description}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Campus heatmap — monthly community activity across regions */}
        <div className="mt-24 border-t border-white/10 pt-16">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            Campus heatmap
          </p>
          <h2 className="mt-5 font-display text-4xl uppercase leading-none sm:text-5xl">
            Where the community gathers<span className="text-volt">.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-muted">
            Monthly events, hackathons and education sessions across campus
            communities in the US and Africa — hover a country or tap a city to
            see what&apos;s on.
          </p>
          <EventsMapLazy data={mapData} />
        </div>
      </div>
    </section>
  );
}
