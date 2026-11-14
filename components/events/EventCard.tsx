import Image from "@/components/ui/AppImage";
import Link from "next/link";

import { formatEventDateTime } from "@/lib/datetime";

export type EventCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  timezone: string;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  venueName: string | null;
  isOnline: boolean;
  imageUrl: string | null;
  community: { name: string; slug: string } | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  const place = [event.city, event.stateProvince, event.country]
    .filter(Boolean)
    .join(", ");
  const locationPrimary = event.isOnline
    ? "Online"
    : (event.venueName ?? event.city) || "Location TBA";
  const locationSecondary = event.isOnline
    ? null
    : event.venueName
      ? place || null
      : [event.stateProvince, event.country].filter(Boolean).join(", ") ||
        null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex h-full flex-col border border-white/10 bg-panel transition-colors hover:border-volt/60"
    >
      <div className="relative aspect-video overflow-hidden bg-ink">
        <div
          className="bg-halftone absolute right-0 top-0 z-10 size-20 opacity-40"
          aria-hidden
        />
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-display text-7xl text-outline-volt"
            >
              {event.title.slice(0, 2).toUpperCase()}
            </span>
            <span
              aria-hidden
              className="absolute bottom-3 right-3 z-10 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt/60"
            >
              GrooVVee
            </span>
          </>
        )}
        <span className="absolute bottom-3 left-3 z-10 bg-ink/90 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-volt">
          {formatEventDateTime(event.startsAt, event.timezone)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="min-w-0">
          <p className="break-words font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-volt">
            {locationPrimary}
          </p>
          {locationSecondary && (
            <p className="mt-1 break-words font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {locationSecondary}
            </p>
          )}
        </div>
        <h3 className="mt-3 break-words font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt sm:text-[26px]">
          {event.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-[1.65] text-muted">
          {event.description}
        </p>
        {event.community && (
          <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Hosted by {event.community.name}
          </p>
        )}
      </div>
    </Link>
  );
}
