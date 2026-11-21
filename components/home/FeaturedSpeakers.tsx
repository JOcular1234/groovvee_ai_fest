import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getFeaturedSpeakers } from "@/lib/public/speakers";

export async function FeaturedSpeakers() {
  const speakers = await getFeaturedSpeakers();

  return (
    <section className="relative overflow-hidden border-t border-ink/15 py-24 sm:py-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          dark
          eyebrow="Speakers"
          title={
            <>
              The minds shaping{" "}
              <span className="bg-volt px-2 text-ink">tomorrow.</span>
            </>
          }
          action={
            <Link
              href="/speakers"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink underline decoration-volt decoration-2 underline-offset-4 transition-colors hover:bg-volt"
            >
              View all speakers
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          }
        />

        {speakers.length === 0 ? (
          <div className="mt-14 border border-ink/15 bg-white/95 p-10 text-center backdrop-blur-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Speaker lineup to be announced
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {speakers.map((speaker, i) => (
              <Reveal key={speaker.id} delay={0.08 * i}>
                <SpeakerCard
                  speaker={speaker}
                  index={i}
                  showBio={false}
                  theme="light"
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
