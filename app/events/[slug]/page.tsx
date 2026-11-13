import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventCard } from "@/components/events/EventCard";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import { getEventProgramme } from "@/lib/public/agenda";
import { getEventBySlug, getRelatedEvents } from "@/lib/public/events";
import { isRegistrationOpen } from "@/lib/registrations";
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
    openGraph: {
      title: event.title,
      description,
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
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All events
        </Link>

        <div className="mt-8">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            {event.isOnline ? "Online" : "In-person"}
            {event.source === "EXTERNAL" && (
              <span className="text-muted">· Community-discovered</span>
            )}
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
            {event.title}
          </h1>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="relative aspect-video overflow-hidden border border-white/10 bg-ink">
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
            <p className="mt-8 whitespace-pre-line leading-relaxed text-muted">
              {event.description}
            </p>
          </div>

          <aside className="self-start border border-white/10 bg-panel p-6 sm:p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
              When
            </p>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.15em] text-white">
              {formatEventDateTime(event.startsAt, event.timezone)}
            </p>
            {event.endsAt && (
              <p className="mt-1 font-mono text-sm uppercase tracking-[0.15em] text-muted">
                → {formatEventDateTime(event.endsAt, event.timezone)}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              {timeZoneLabel(event.startsAt, event.timezone)}
            </p>

            <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
              Where
            </p>
            <p className="mt-3 text-sm text-white">{location || "Location TBA"}</p>

            {event.community && (
              <>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  Hosted by
                </p>
                <Link
                  href={`/communities/${event.community.slug}`}
                  className="mt-3 inline-block text-sm text-volt transition-colors hover:text-white"
                >
                  {event.community.name}
                </Link>
              </>
            )}

            {isRegistrationOpen(event) && (
              <Link
                href={`/events/${event.slug}/register`}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-volt px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
              >
                Register for this event
              </Link>
            )}
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${isRegistrationOpen(event) ? "mt-3 border border-white/25 text-white hover:border-volt hover:text-volt" : "mt-8 bg-volt text-ink hover:opacity-90"} inline-flex w-full items-center justify-center gap-2 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors`}
              >
                {event.source === "EXTERNAL" ? "Register on organiser's site" : "Event link"}
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </aside>
        </div>

        {programme.length > 0 && (
          <div className="mt-16">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Programme
            </p>
            <div className="mt-6 divide-y divide-white/5 border border-white/10 bg-panel">
              {programme.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-4 p-6 sm:grid-cols-[10rem_1fr] sm:gap-8"
                >
                  <div className="font-mono text-xs uppercase tracking-[0.15em] text-volt">
                    {new Intl.DateTimeFormat("en-GB", {
                      timeZone: event.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(s.startsAt)}
                    <span className="text-muted">
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
                      <h3 className="font-display text-xl uppercase leading-tight">
                        {s.title}
                      </h3>
                      <span className="bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                        {SESSION_TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </div>
                    {s.location && (
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                        {s.location}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {s.description}
                    </p>
                    {s.speakers.length > 0 && (
                      <p className="mt-3 text-xs text-white">
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
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
              More events
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
