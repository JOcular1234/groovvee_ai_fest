import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedSpeakers } from "@/lib/public/speakers";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Speakers",
  description:
    "Meet the builders, researchers and creatives speaking at GrooVVee AI Fest.",
  path: "/speakers",
});

export default async function SpeakersPage() {
  const speakers = await getPublishedSpeakers();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          The Lineup
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-7xl">
          <span className="bg-volt px-2 text-ink">Speakers.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-medium text-ink/70">
          The people building, questioning and reimagining what AI means for the
          world — live on the Groovvee stage.
        </p>
        <Link
          href="/speakers/apply"
          className="mt-8 inline-flex items-center gap-2 border border-ink bg-ink px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel"
        >
          Apply to speak
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>

        {speakers.length === 0 ? (
          <div className="mt-16 border border-ink/15 bg-white/95 p-12 text-center backdrop-blur-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Announcements coming
            </p>
            <p className="mx-auto mt-4 max-w-md text-ink/70">
              The full speaker lineup is being finalized. Check back soon — the
              minds shaping tomorrow are on their way.
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {speakers.map((speaker, i) => (
              <Reveal key={speaker.id} delay={0.06 * (i % 4)}>
                <SpeakerCard speaker={speaker} index={i} theme="light" />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
