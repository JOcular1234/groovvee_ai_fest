import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { EventForm } from "@/components/admin/EventForm";
import { utcToZonedLocalInput } from "@/lib/datetime";
import { db, withDbRetry } from "@/lib/db";
import { getEventById, listCommunitiesForSelect } from "@/lib/events";

export const metadata: Metadata = {
  title: "Edit Event · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [event, communities] = await withDbRetry(() =>
    Promise.all([getEventById(db, id), listCommunitiesForSelect(db)])
  );
  if (!event) notFound();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Events
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit event<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <EventForm
            communities={communities}
            event={{
              id: event.id,
              title: event.title,
              slug: event.slug,
              source: event.source,
              externalId: event.externalId ?? "",
              description: event.description,
              startsAtLocal: utcToZonedLocalInput(
                event.startsAt,
                event.timezone
              ),
              endsAtLocal: event.endsAt
                ? utcToZonedLocalInput(event.endsAt, event.timezone)
                : "",
              timezone: event.timezone,
              city: event.city ?? "",
              country: event.country ?? "",
              region: event.region ?? "",
              venueName: event.venueName ?? "",
              isOnline: event.isOnline,
              url: event.url ?? "",
              imageUrl: event.imageUrl ?? "",
              communityId: event.communityId ?? "",
              featured: event.featured,
              published: event.published,
              sortOrder: event.sortOrder,
            }}
          />
        </div>
      </div>
    </section>
  );
}
