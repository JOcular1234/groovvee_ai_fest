import { toZonedIso } from "@/lib/datetime";
import type { getEventBySlug } from "@/lib/public/events";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type PublicEvent = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

// schema.org Event for Google's event rich results. Required: name,
// startDate, location. See developers.google.com/search/docs/appearance/structured-data/event
export function eventJsonLd(
  event: PublicEvent,
  opts: { registrationOpen: boolean }
): Record<string, unknown> {
  const pageUrl = absoluteUrl(`/events/${event.slug}`);
  const subdivision = event.locationId
    ? event.stateProvince
    : (event.stateProvince ?? event.region);

  const location = event.isOnline
    ? { "@type": "VirtualLocation", url: event.url ?? pageUrl }
    : {
        "@type": "Place",
        name: event.venueName ?? event.city ?? "To be announced",
        address: {
          "@type": "PostalAddress",
          ...(event.city && { addressLocality: event.city }),
          ...(subdivision && { addressRegion: subdivision }),
          ...(event.country && { addressCountry: event.country }),
        },
      };

  const organizer = event.community
    ? {
        "@type": "Organization",
        name: event.community.name,
        url: absoluteUrl(`/communities/${event.community.slug}`),
      }
    : event.source === "GROOVVEE"
      ? { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") }
      : undefined;

  const offerUrl = opts.registrationOpen
    ? absoluteUrl(`/events/${event.slug}/register`)
    : event.url;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description.slice(0, 5000),
    url: pageUrl,
    startDate: toZonedIso(event.startsAt, event.timezone),
    ...(event.endsAt && { endDate: toZonedIso(event.endsAt, event.timezone) }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location,
    ...(event.imageUrl && { image: [absoluteUrl(event.imageUrl)] }),
    ...(organizer && { organizer }),
    ...(offerUrl && {
      offers: {
        "@type": "Offer",
        url: offerUrl,
        availability: opts.registrationOpen
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      },
    }),
  };
}
