import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { AgendaForm } from "@/components/admin/AgendaForm";
import { utcToZonedLocalInput } from "@/lib/datetime";
import { db, withDbRetry } from "@/lib/db";
import {
  getAgendaItemById,
  listEventsForAgendaSelect,
  listSpeakersForSelect,
} from "@/lib/agenda";

export const metadata: Metadata = {
  title: "Edit Session · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditAgendaItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [item, speakers] = await withDbRetry(() =>
    Promise.all([getAgendaItemById(db, id), listSpeakersForSelect(db)])
  );
  if (!item) notFound();

  // Include the linked event even if it has since been unpublished, so the
  // existing association is preserved rather than silently dropped.
  const events = await withDbRetry(() =>
    listEventsForAgendaSelect(db, item.eventId)
  );
  const tz =
    events.find((e) => e.id === item.eventId)?.timezone ?? "UTC";

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Agenda
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit session<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <AgendaForm
            events={events}
            speakers={speakers}
            item={{
              id: item.id,
              title: item.title,
              description: item.description,
              type: item.type,
              startsAtLocal: utcToZonedLocalInput(item.startsAt, tz),
              endsAtLocal: utcToZonedLocalInput(item.endsAt, tz),
              location: item.location ?? "",
              eventId: item.eventId ?? "",
              speakerIds: item.speakers.map((s) => s.id),
              published: item.published,
              sortOrder: item.sortOrder,
            }}
          />
        </div>
      </div>
    </section>
  );
}
