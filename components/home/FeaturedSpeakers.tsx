import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getFeaturedSpeakers } from "@/lib/public/speakers";

export async function FeaturedSpeakers() {
  const speakers = await getFeaturedSpeakers();

  return (
    <section className="border-t border-white/10 bg-panel py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Speakers"
          title={
            <>
              The minds shaping <span className="text-volt">tomorrow.</span>
            </>
          }
          action={
            <Link
              href="/speakers"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:text-volt"
            >
              View all speakers
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          }
        />

        {speakers.length === 0 ? (
          <div className="mt-14 border border-white/10 bg-ink p-10 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
              Speaker lineup to be announced
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {speakers.map((speaker, i) => (
              <Reveal key={speaker.id} delay={0.08 * i}>
                <SpeakerCard speaker={speaker} index={i} showBio={false} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
