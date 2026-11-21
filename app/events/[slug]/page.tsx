import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "@/components/ui/AppImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { EventCard } from "@/components/events/EventCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import { getEventProgramme } from "@/lib/public/agenda";
import { getEventBySlug, getRelatedEvents } from "@/lib/public/events";
import { isRegistrationOpen } from "@/lib/registrations";
import { eventJsonLd } from "@/lib/seo/event-json-ld";
import { SESSION_TYPE_LABELS } from "@/lib/validation/agenda";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event" };
  const description = event.description.slice(0, 160);
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description,
      url: `/events/${event.slug}`,
      ...(event.imageUrl ? { images: [{ url: event.imageUrl }] } : {}),
    },
  };
}

// Dynamic slug params — renders per request over cached queries.
export const instant = false;

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Registration open/closed is time-dependent — render at request time.
  await connection();
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [related, programme] = await Promise.all([
    getRelatedEvents({ id: event.id, communityId: event.communityId }, 3),
    getEventProgramme(event.id),
  ]);

  // Linked locations show the structured state/province; unlinked legacy
  // events fall back to their free-text region as before.
  const subdivision = event.locationId
    ? event.stateProvince
    : (event.stateProvince ?? event.region);
  const location = event.isOnline
    ? "Online event"
    : [
        event.venueName,
        [event.city, subdivision, event.country].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <JsonLd
        data={eventJsonLd(event, { registrationOpen: isRegistrationOpen(event) })}
      />
      <CollageBackground />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All events
        </Link>

        <div className="mt-8">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            {event.isOnline ? "Online" : "In-person"}
            {event.source === "EXTERNAL" && (
              <span className="text-ink/50">· Community-discovered</span>
            )}
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-6xl">
            {event.title}
          </h1>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="relative aspect-video overflow-hidden border border-ink/15 bg-ink">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
                >
                  {event.title.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <p className="mt-8 whitespace-pre-line border border-ink/15 bg-white/95 p-6 leading-relaxed text-ink/75 backdrop-blur-sm sm:p-8">
              {event.description}
            </p>
          </div>

          <aside className="self-start border border-ink/15 bg-white/95 p-6 backdrop-blur-sm sm:p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink/60">
              When
            </p>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.15em] text-ink">
              {formatEventDateTime(event.startsAt, event.timezone)}
            </p>
            {event.endsAt && (
              <p className="mt-1 font-mono text-sm uppercase tracking-[0.15em] text-ink/60">
                → {formatEventDateTime(event.endsAt, event.timezone)}
              </p>
            )}
            <p className="mt-2 text-xs text-ink/60">
              {timeZoneLabel(event.startsAt, event.timezone)}
            </p>

            <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Where
            </p>
            <p className="mt-3 text-sm text-ink">{location || "Location TBA"}</p>

            {event.community && (
              <>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink/60">
                  Hosted by
                </p>
                <Link
                  href={`/communities/${event.community.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-ink underline decoration-volt decoration-2 underline-offset-2 transition-colors hover:bg-volt"
                >
                  {event.community.name}
                </Link>
              </>
            )}

            {isRegistrationOpen(event) && (
              <Link
                href={`/events/${event.slug}/register`}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 border border-ink bg-ink px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel"
              >
                Register for this event
              </Link>
            )}
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${isRegistrationOpen(event) ? "mt-3 border border-ink/25 text-ink hover:bg-ink hover:text-volt" : "mt-8 border border-ink bg-ink text-volt hover:bg-panel"} inline-flex w-full items-center justify-center gap-2 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors`}
              >
                {event.source === "EXTERNAL" ? "Register on organiser's site" : "Event link"}
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </aside>
        </div>

        {programme.length > 0 && (
          <div className="mt-16">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Programme
            </p>
            <div className="mt-6 divide-y divide-ink/10 border border-ink/15 bg-white/95 backdrop-blur-sm">
              {programme.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-4 p-6 sm:grid-cols-[10rem_1fr] sm:gap-8"
                >
                  <div className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-ink">
                    {new Intl.DateTimeFormat("en-GB", {
                      timeZone: event.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(s.startsAt)}
                    <span className="text-ink/60">
                      {" "}
                      –{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: event.timezone,
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(s.endsAt)}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-xl uppercase leading-tight text-ink">
                        {s.title}
                      </h3>
                      <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                        {SESSION_TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </div>
                    {s.location && (
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/60">
                        {s.location}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">
                      {s.description}
                    </p>
                    {s.speakers.length > 0 && (
                      <p className="mt-3 text-xs font-medium text-ink">
                        {s.speakers
                          .map((sp) => `${sp.name} · ${sp.organization}`)
                          .join("  ·  ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-20">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              More events
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <EventCard key={e.id} event={e} theme="light" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
