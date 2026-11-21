import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { EventCard } from "@/components/events/EventCard";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPublicEvents } from "@/lib/public/events";

const HOME_EVENTS_LIMIT = 3;

export async function UpcomingEvents() {
  const { events } = await getPublicEvents({}, "upcoming", 1);
  const shown = events.slice(0, HOME_EVENTS_LIMIT);

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <CollageBackground mute="bg-white/80" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          dark
          eyebrow="Events"
          title={
            <>
              What&apos;s{" "}
              <span className="bg-volt px-2 text-ink">next.</span>
            </>
          }
          action={
            <Link
              href="/events"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink underline decoration-volt decoration-2 underline-offset-4 transition-colors hover:bg-volt"
            >
              Explore events
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          }
        />

        {shown.length === 0 ? (
          <div className="mt-14 border border-ink/15 bg-white/95 p-10 text-center backdrop-blur-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              New events announced soon
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((e, i) => (
              <Reveal key={e.id} delay={0.07 * i}>
                <EventCard event={e} theme="light" />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
