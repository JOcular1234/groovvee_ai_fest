"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { useState } from "react";
import { event, faqs } from "@/data/event";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-ink/15 py-24 sm:py-32">
      <CollageBackground />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        {/* Left: heading + contact, stays in view while the list scrolls */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            dark
            eyebrow="FAQ"
            title={
              <>
                Questions,
                <br />
                <span className="bg-volt px-2 text-ink">answered.</span>
              </>
            }
          />

          <Reveal delay={0.1}>
            <div className="mt-10 max-w-sm border border-ink bg-volt p-6 text-ink shadow-[6px_6px_0_0_currentColor]">
              <p className="text-xl font-semibold leading-snug">
                Can&rsquo;t find your question?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">
                Send it to the team and we&rsquo;ll reply with a real answer.
              </p>
              <a
                href={`mailto:${event.contactEmail}`}
                className="group mt-5 inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {event.contactEmail}
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </div>
          </Reveal>
        </div>

        {/* Right: each question is its own slab; the open one lifts */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={faq.question} delay={0.04 * i}>
                <div
                  className={`border bg-white/95 text-ink backdrop-blur-sm transition-all duration-300 ${
                    isOpen
                      ? "-translate-y-0.5 border-ink shadow-[6px_6px_0_0_currentColor]"
                      : "border-ink/15 hover:border-ink/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-trigger-${i}`}
                    className={`flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink sm:px-7 sm:py-6 ${
                      isOpen ? "bg-volt" : ""
                    }`}
                  >
                    <span
                      className={`text-lg font-semibold leading-snug sm:text-xl ${
                        isOpen ? "text-ink" : "text-ink/85"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      aria-hidden
                      className={`grid size-8 shrink-0 place-items-center border border-ink transition-colors ${
                        isOpen ? "bg-ink" : "bg-white"
                      }`}
                    >
                      <Plus
                        className={`size-4 transition-transform duration-300 ${
                          isOpen ? "rotate-45 text-volt" : "text-ink"
                        }`}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${i}`}
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[62ch] px-5 pb-7 pt-5 text-base leading-relaxed text-ink/70 sm:px-7">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}