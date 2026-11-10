import type { Metadata } from "next";
import { connection } from "next/server";

import { AgendaForm } from "@/components/admin/AgendaForm";
import { db, withDbRetry } from "@/lib/db";
import { listEventsForAgendaSelect, listSpeakersForSelect } from "@/lib/agenda";

export const metadata: Metadata = {
  title: "New Session · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function NewAgendaItemPage() {
  await connection();
  const [events, speakers] = await withDbRetry(() =>
    Promise.all([listEventsForAgendaSelect(db), listSpeakersForSelect(db)])
  );

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Agenda
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add session<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <AgendaForm events={events} speakers={speakers} />
        </div>
      </div>
    </section>
  );
}
