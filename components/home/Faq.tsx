"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { event, faqs } from "@/data/event";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-white/10 bg-panel py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading
            eyebrow="FAQ"
            title={
              <>
                Questions,
                <br />
                <span className="text-volt">answered.</span>
              </>
            }
          />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-sm text-muted">
              Still curious? Reach us at{" "}
              <a
                href={`mailto:${event.contactEmail}`}
                className="text-volt underline-offset-4 hover:underline"
              >
                {event.contactEmail}
              </a>
            </p>
          </Reveal>
        </div>

        <div>
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={faq.question} delay={0.04 * i}>
                <div className="border-b border-white/10 first:border-t">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span
                      className={`text-lg font-semibold transition-colors ${
                        isOpen ? "text-volt" : "text-white"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <Plus
                      className={`size-5 shrink-0 text-volt transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-6 leading-relaxed text-muted">
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
