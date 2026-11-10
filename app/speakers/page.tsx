import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedSpeakers } from "@/lib/public/speakers";

export const metadata: Metadata = {
  title: "Speakers",
};

export default async function SpeakersPage() {
  const speakers = await getPublishedSpeakers();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          The Lineup
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Speakers<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          The people building, questioning and reimagining what AI means for the
          world — live on the Groovvee stage.
        </p>
        <Link
          href="/speakers/apply"
          className="mt-8 inline-flex items-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
        >
          Apply to speak
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>

        {speakers.length === 0 ? (
          <div className="mt-16 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Announcements coming
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              The full speaker lineup is being finalized. Check back soon — the
              minds shaping tomorrow are on their way.
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {speakers.map((speaker, i) => (
              <Reveal key={speaker.id} delay={0.06 * (i % 4)}>
                <SpeakerCard speaker={speaker} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
