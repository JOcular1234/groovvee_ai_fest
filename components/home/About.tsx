import { highlights } from "@/data/event";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About() {
  return (
    <section id="about" className="bg-ink py-24 sm:py-32">
      <div className="w-full px-5 sm:px-10 2xl:px-16">
        <SectionHeading
          eyebrow="About the festival"
          title={
            <>
              More than an event.
              <br />
              It&apos;s an <span className="text-volt">experience.</span>
            </>
          }
        />
        

        <Reveal delay={0.1}>
          <p className="mt-12 max-w-3xl text-2xl font-medium leading-snug text-white/90 sm:text-3xl">
            Groovvee AI Fest brings together{" "}
            <span className="text-volt">curious minds</span>, innovators,
            developers, creatives and{" "}
            <span className="text-volt">entrepreneurs</span> to explore how
            artificial intelligence is transforming the world around us.
          </p>
        </Reveal>

        <div className="mt-20 border-t border-white/10">
          {highlights.map((item, i) => (
            <Reveal key={item.index} delay={0.08 * i}>
              <div className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 border-b border-white/10 py-8 transition-all sm:grid-cols-[80px_240px_1fr] sm:gap-x-10 sm:py-10">
                <span className="font-mono text-sm font-bold text-volt">
                  {item.index}
                </span>
                <h3 className="font-display text-3xl uppercase transition-colors group-hover:text-volt sm:text-5xl">
                  {item.title}
                </h3>
                <p className="col-span-2 max-w-xl leading-relaxed text-muted sm:col-span-1">
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
