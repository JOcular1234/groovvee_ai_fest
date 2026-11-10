import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/Reveal";
import { getPublishedCommunities } from "@/lib/public/communities";
import {
  COMMUNITY_TYPE_LABELS,
  COMMUNITY_TYPES,
} from "@/lib/validation/community";

export const metadata: Metadata = {
  title: "Communities",
};

export default async function CommunitiesPage() {
  const communities = await getPublishedCommunities();
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

        {grouped.length === 0 ? (
          <div className="mt-16 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Launching soon
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Community pages are being set up. Check back soon to find your
              tribe.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.value} className="mt-16">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                {group.label}s
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
                          {COMMUNITY_TYPE_LABELS[c.type] ?? c.type}
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
      </div>
    </section>
  );
}
