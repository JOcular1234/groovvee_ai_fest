import type { Metadata } from "next";
import { connection } from "next/server";

import { CompetitionForm } from "@/components/admin/CompetitionForm";
import { db, withDbRetry } from "@/lib/db";
import { listEventsForSelect } from "@/lib/events";

export const metadata: Metadata = {
  title: "New Competition · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function NewCompetitionPage() {
  await connection();
  const events = await withDbRetry(() => listEventsForSelect(db));

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Competitions
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add competition<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <CompetitionForm events={events} />
        </div>
      </div>
    </section>
  );
}
