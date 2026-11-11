import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";

import { getCityIndex } from "@/lib/public/locations";

export const metadata: Metadata = {
  title: "Event Cities",
  description:
    "Discover AI community events by city — GrooVVee meetups, hackathons and gatherings around the world.",
  openGraph: {
    title: "GrooVVee Event Cities",
    description:
      "Discover AI community events by city — meetups, hackathons and gatherings around the world.",
  },
};

// Uses searchParams filters — renders per request over cached queries.
export const instant = false;

const selectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

export default async function EventCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const region = sp.region || undefined;
  const country = sp.country || undefined;
  const filtered = !!(q || region || country);

  const { cities, regions, countries } = await getCityIndex({
    q: q || undefined,
    region,
    country,
  });

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All events
        </Link>
        <p className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          City discovery
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Find your city<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          Cities hosting published GrooVVee events — community meetups,
          hackathons and festivals. Pick a city to see what&apos;s on.
        </p>

        <form action="/events/cities" className="mt-12 flex flex-wrap items-end gap-2">
          <div className="relative min-w-55 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search cities…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select name="region" defaultValue={region ?? ""} className={selectClass}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="country" defaultValue={country ?? ""} className={selectClass}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
          {filtered && (
            <Link
              href="/events/cities"
              className="px-2 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
            >
              Clear
            </Link>
          )}
        </form>

        {cities.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {filtered ? "No matches" : "Coming soon"}
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              {filtered
                ? "No cities match these filters. Try widening your search."
                : "No cities have published events yet — check back soon."}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/events/cities/${c.slug}`}
                className="group flex flex-col border border-white/10 bg-panel p-6 transition-colors hover:border-volt/60"
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                  {c.region}
                </p>
                <h2 className="mt-3 font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt">
                  {c.name}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {[c.stateProvince, c.country].filter(Boolean).join(", ")}
                </p>
                <p className="mt-auto pt-5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  {c.upcomingCount > 0
                    ? `${c.upcomingCount} upcoming`
                    : "No upcoming"}{" "}
                  · {c.publishedCount} published
                </p>
                <span className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
                  View events
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
