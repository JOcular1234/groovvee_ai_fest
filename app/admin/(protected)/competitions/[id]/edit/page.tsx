import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { CompetitionForm } from "@/components/admin/CompetitionForm";
import { RoundsEditor } from "@/components/admin/RoundsEditor";
import { getCompetitionById } from "@/lib/competitions";
import { utcToZonedLocalInput } from "@/lib/datetime";
import { db, withDbRetry } from "@/lib/db";
import { listEventsForSelect } from "@/lib/events";

export const metadata: Metadata = {
  title: "Edit Competition · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [competition, events] = await withDbRetry(() =>
    Promise.all([getCompetitionById(db, id), listEventsForSelect(db)])
  );
  if (!competition) notFound();

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Competitions
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit competition<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <CompetitionForm
            events={events}
            competition={{
              id: competition.id,
              title: competition.title,
              slug: competition.slug,
              kind: competition.kind,
              status: competition.status,
              description: competition.description,
              startsAtLocal: competition.startsAt
                ? utcToZonedLocalInput(
                    competition.startsAt,
                    competition.timezone
                  )
                : "",
              endsAtLocal: competition.endsAt
                ? utcToZonedLocalInput(
                    competition.endsAt,
                    competition.timezone
                  )
                : "",
              timezone: competition.timezone,
              prizeText: competition.prizeText ?? "",
              rulesUrl: competition.rulesUrl ?? "",
              imageUrl: competition.imageUrl ?? "",
              eventId: competition.eventId ?? "",
              featured: competition.featured,
              published: competition.published,
              sortOrder: competition.sortOrder,
            }}
          />

          <RoundsEditor
            competitionId={competition.id}
            timezone={competition.timezone}
            rounds={competition.rounds.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description ?? "",
              startsAtLocal: r.startsAt
                ? utcToZonedLocalInput(r.startsAt, competition.timezone)
                : "",
              endsAtLocal: r.endsAt
                ? utcToZonedLocalInput(r.endsAt, competition.timezone)
                : "",
              sortOrder: r.sortOrder,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
