import type { Metadata } from "next";
import { ArrowUpRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EventCard } from "@/components/events/EventCard";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import {
  getFeaturedOrNextEvent,
  getPublicEventFilterOptions,
  getPublicEvents,
} from "@/lib/public/events";
import { EVENT_SOURCES } from "@/lib/validation/event";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Discover GrooVVee events worldwide — campus meetups, community gatherings, hackathons and AI festivals, across cities and timezones.",
  openGraph: {
    title: "GrooVVee Events",
    description:
      "A global calendar of AI community events — meetups, hackathons and festivals.",
  },
};

// Uses searchParams filters — renders per request over cached queries.
export const instant = false;

const selectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    region?: string;
    country?: string;
    source?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const region = sp.region || undefined;
  const country = sp.country || undefined;
  const source: "GROOVVEE" | "EXTERNAL" | undefined =
    sp.source === "GROOVVEE" || sp.source === "EXTERNAL" ? sp.source : undefined;
  const view = sp.view === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(sp.page) || 1);
  const filtered = !!(q || region || country || source);

  const filters = { q: q || undefined, region, country, source };

  const [result, options, hero] = await Promise.all([
    getPublicEvents(filters, view, page),
    getPublicEventFilterOptions(),
    view === "upcoming" && !filtered && page === 1
      ? getFeaturedOrNextEvent()
      : Promise.resolve(null),
  ]);

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      region,
      country,
      source,
      view: view === "past" ? "past" : undefined,
      page: undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/events${s ? `?${s}` : ""}`;
  };

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Global calendar
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Discover what&apos;s happening in AI<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          Campus meetups, community gatherings, hackathons and festivals —
          GrooVVee events happening across cities, countries and timezones.
        </p>

        {hero && (
          <Link
            href={`/events/${hero.slug}`}
            className="group mt-12 grid overflow-hidden border border-volt/40 bg-panel transition-colors hover:border-volt lg:grid-cols-[3fr_2fr]"
          >
            <div className="relative min-h-64 bg-ink lg:min-h-96">
              {hero.imageUrl ? (
                <Image
                  src={hero.imageUrl}
                  alt={hero.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
                >
                  {hero.title.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
                Featured event
              </p>
              <h2 className="mt-4 font-display text-3xl uppercase leading-tight sm:text-4xl">
                {hero.title}
              </h2>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-white">
                {formatEventDateTime(hero.startsAt, hero.timezone)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {timeZoneLabel(hero.startsAt, hero.timezone)}
              </p>
              <p className="mt-4 text-sm text-muted">
                {hero.isOnline
                  ? "Online event"
                  : [hero.venueName, [hero.city, hero.country].filter(Boolean).join(", ")]
                      .filter(Boolean)
                      .join(" · ") || "Location TBA"}
              </p>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">
                {hero.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
                View event
                <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        )}

        <form action="/events" className="mt-12 flex flex-wrap items-end gap-2">
          <div className="relative min-w-55 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search events, cities, venues…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select name="region" defaultValue={region ?? ""} className={selectClass}>
            <option value="">All regions</option>
            {options.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="country" defaultValue={country ?? ""} className={selectClass}>
            <option value="">All countries</option>
            {options.countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={source ?? ""} className={selectClass}>
            <option value="">All events</option>
            {EVENT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {view === "past" && <input type="hidden" name="view" value="past" />}
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
        </form>

        <div className="mt-10 flex gap-6 border-b border-white/10 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
          <Link
            href={href({ view: undefined })}
            className={`pb-3 transition-colors ${
              view === "upcoming"
                ? "border-b-2 border-volt text-volt"
                : "text-muted hover:text-white"
            }`}
          >
            Upcoming
          </Link>
          <Link
            href={href({ view: "past" })}
            className={`pb-3 transition-colors ${
              view === "past"
                ? "border-b-2 border-volt text-volt"
                : "text-muted hover:text-white"
            }`}
          >
            Past events
          </Link>
        </div>

        {result.events.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {filtered ? "No matches" : "Coming soon"}
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              {filtered
                ? "No events match these filters. Try widening your search."
                : view === "upcoming"
                  ? "No upcoming events are published yet — check back soon."
                  : "No past events to show yet."}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}

        {result.pages > 1 && (
          <div className="mt-10 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
            <Link
              href={href({ page: String(result.page - 1) })}
              aria-disabled={result.page <= 1}
              className={`border px-4 py-2 ${
                result.page <= 1
                  ? "pointer-events-none border-white/10 text-muted/40"
                  : "border-white/25 text-white hover:border-volt hover:text-volt"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-muted">
              Page {result.page} of {result.pages} · {result.total} events
            </span>
            <Link
              href={href({ page: String(result.page + 1) })}
              aria-disabled={result.page >= result.pages}
              className={`border px-4 py-2 ${
                result.page >= result.pages
                  ? "pointer-events-none border-white/10 text-muted/40"
                  : "border-white/25 text-white hover:border-volt hover:text-volt"
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
