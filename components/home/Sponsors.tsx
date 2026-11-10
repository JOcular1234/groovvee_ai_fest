import { ArrowUpRight } from "lucide-react";
import { event, sponsorSlots } from "@/data/event";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Sponsors() {
  return (
    <section className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Partners"
          title={
            <>
              Sponsors & <span className="text-volt">partners.</span>
            </>
          }
        />

        <Reveal delay={0.1} className="mt-14">
          <div className="grid grid-cols-2 gap-px border border-dashed border-white/15 bg-white/5 sm:grid-cols-3">
            {Array.from({ length: sponsorSlots }, (_, i) => (
              <div
                key={i}
                className="flex aspect-5/2 items-center justify-center bg-ink transition-colors hover:bg-panel"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted/60">
                  Partner {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal
          delay={0.15}
          className="mt-12 flex flex-wrap items-center justify-between gap-6"
        >
          <p className="max-w-md text-muted">
            Want to put your brand in front of the builders of tomorrow?
            Partner slots are open.
          </p>
          <a
            href={`mailto:${event.contactEmail}?subject=Partnership%20—%20Groovvee%20AI%20Fest`}
            className="inline-flex items-center gap-2 border border-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-volt hover:text-ink"
          >
            Become a partner
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
