import { highlights } from "@/data/event";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About() {
  return (
    <section id="about" className="relative overflow-hidden py-24 sm:py-32">
      <CollageBackground mute="bg-white/80" />
      <div className="relative w-full px-5 sm:px-10 2xl:px-16">
        <SectionHeading
          dark
          eyebrow="About the festival"
          title={
            <>
              More than an event.
              <br />
              It&apos;s an{" "}
              <span className="bg-volt px-2 text-ink">experience.</span>
            </>
          }
        />


        <Reveal delay={0.1}>
          <p className="mt-12 max-w-3xl text-2xl font-bold leading-snug text-ink sm:text-3xl">
            Groovvee AI Fest brings together{" "}
            <span className="bg-volt px-1.5 text-ink">curious minds</span>,
            innovators, developers, creatives and{" "}
            <span className="bg-volt px-1.5 text-ink">entrepreneurs</span> to
            explore how artificial intelligence is transforming the world
            around us.
          </p>
        </Reveal>

        <div className="mt-20 border border-ink/15 bg-white/95 px-6 backdrop-blur-sm sm:px-10">
          {highlights.map((item, i) => (
            <Reveal key={item.index} delay={0.08 * i}>
              <div className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 border-b border-ink/15 py-8 transition-all last:border-b-0 sm:grid-cols-[80px_240px_1fr] sm:gap-x-10 sm:py-10">
                <span className="bg-volt px-1.5 py-0.5 font-mono text-sm font-bold text-ink">
                  {item.index}
                </span>
                <h3 className="font-display text-3xl uppercase text-ink transition-colors group-hover:underline group-hover:decoration-volt group-hover:decoration-[0.08em] group-hover:underline-offset-8 sm:text-5xl">
                  {item.title}
                </h3>
                <p className="col-span-2 max-w-xl font-medium leading-relaxed text-ink/70 sm:col-span-1">
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
