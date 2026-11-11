import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventCard } from "@/components/events/EventCard";
import { getPublicEvents } from "@/lib/public/events";
import { getCityBySlug, getCityIndex } from "@/lib/public/locations";

function geoLine(city: {
  stateProvince: string;
  country: string;
  region: string;
}) {
  return [city.stateProvince, city.country, city.region]
    .filter(Boolean)
    .join(" · ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: "City" };
  const { cities } = await getCityIndex();
  const entry = cities.find((c) => c.id === city.id);
  const where = [city.stateProvince, city.country].filter(Boolean).join(", ");
  const description =
    entry && entry.publishedCount > 0
      ? `${entry.publishedCount} published AI event${entry.publishedCount === 1 ? "" : "s"} in ${city.name}, ${where} — meetups, hackathons and community gatherings.`
      : `GrooVVee community events in ${city.name}, ${where} — listings appear here as they are announced.`;
  return {
    title: `Events in ${city.name}`,
    description,
    openGraph: { title: `Events in ${city.name} — GrooVVee`, description },
  };
}

// Dynamic slug params — renders per request over cached queries.
export const instant = false;

export default async function CityEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  const [upcoming, past, cityIndex] = await Promise.all([
    getPublicEvents({ locationId: city.id }, "upcoming", 1),
    getPublicEvents({ locationId: city.id }, "past", 1),
    getCityIndex(),
  ]);
  const counts = cityIndex.cities.find((c) => c.id === city.id);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <Link
          href="/events/cities"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All cities
        </Link>
        <p className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          City
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          {city.name}
          <span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          {geoLine(city)} — {counts?.publishedCount ?? 0} published event
          {(counts?.publishedCount ?? 0) === 1 ? "" : "s"},{" "}
          {counts?.upcomingCount ?? 0} upcoming.
        </p>
        <Link
          href={`/events?location=${city.id}`}
          className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt transition-colors hover:text-white"
        >
          View in events directory
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>

        <div className="mt-14">
          <p className="border-b border-white/10 pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
            Upcoming events
          </p>
          {upcoming.events.length === 0 ? (
            <div className="mt-8 border border-white/10 bg-panel p-10 text-center">
              <p className="text-muted">
                No upcoming events in {city.name} yet — check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>

        {past.events.length > 0 && (
          <div className="mt-16">
            <p className="border-b border-white/10 pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
              Past events
            </p>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
