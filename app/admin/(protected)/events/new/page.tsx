import type { Metadata } from "next";
import { connection } from "next/server";

import { EventForm } from "@/components/admin/EventForm";
import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { listCommunitiesForSelect } from "@/lib/events";
import { listLocationsForSelect } from "@/lib/locations";

export const metadata: Metadata = {
  title: "New Event · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function NewEventPage() {
  await requireSectionAccess("events", "manage");
  await connection();
  const [communities, locations] = await withDbRetry(() =>
    Promise.all([listCommunitiesForSelect(db), listLocationsForSelect(db)])
  );

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Events
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add event<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <EventForm communities={communities} locations={locations} />
        </div>
      </div>
    </section>
  );
}
