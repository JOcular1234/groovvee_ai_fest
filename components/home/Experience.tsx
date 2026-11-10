import {
  FlaskConical,
  Lightbulb,
  MessagesSquare,
  Presentation,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { experiences } from "@/data/event";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const icons: Record<string, LucideIcon> = {
  Presentation,
  MessagesSquare,
  FlaskConical,
  Users,
  Zap,
  Lightbulb,
};

export function Experience() {
  return (
    <section className="border-t border-white/10 bg-panel py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The experience"
              title={
                <>
                  Come for the knowledge.
                  <br />
                  Stay for the <span className="text-volt">experience.</span>
                </>
              }
            />

            <Reveal delay={0.15} className="mt-12">
              <div className="relative aspect-square overflow-hidden border border-white/10 bg-ink sm:aspect-4/3 lg:aspect-square">
                <div className="bg-grid absolute inset-0" aria-hidden />
                <div
                  className="absolute -right-10 -top-10 size-48 rounded-full border-2 border-volt/50"
                  aria-hidden
                />
                <div
                  className="bg-halftone absolute bottom-0 left-0 h-32 w-1/2 opacity-50"
                  aria-hidden
                />
                <span
                  aria-hidden
                  className="text-outline-volt absolute inset-0 flex items-center justify-center font-display text-[10rem] leading-none sm:text-[13rem]"
                >
                  AI
                </span>
                <span className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.3em] text-volt">
                  + Groovvee
                </span>
                <span className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
                  Fest +
                </span>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                * Program details currently being finalized.
              </p>
            </Reveal>
          </div>

          <div className="flex flex-col justify-center">
            {experiences.map((item, i) => {
              const Icon = icons[item.icon];
              return (
                <Reveal key={item.title} delay={0.05 * i}>
                  <div className="group flex items-center gap-5 border-b border-white/10 py-6 transition-colors first:border-t sm:gap-8 sm:py-7">
                    <span className="flex size-12 shrink-0 items-center justify-center border border-white/15 transition-colors group-hover:border-volt group-hover:bg-volt">
                      {Icon && (
                        <Icon
                          className="size-5 text-volt transition-colors group-hover:text-ink"
                          aria-hidden
                        />
                      )}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-display text-xl uppercase transition-transform duration-300 group-hover:translate-x-2 sm:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {item.description}
                      </p>
                    </div>
                    <span className="hidden font-mono text-xs font-bold text-muted sm:block">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
