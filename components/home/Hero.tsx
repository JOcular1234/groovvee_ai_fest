"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Building2 } from "lucide-react";
import { event } from "@/data/event";
import { ButtonLink } from "@/components/ui/ButtonLink";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const meta = [
  { icon: CalendarDays, label: "Date", value: event.dateDisplay },
  { icon: Building2, label: "Venue", value: event.venue },
  { icon: MapPin, label: "Location", value: event.location },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <div
        className="bg-grid mask-[radial-gradient(ellipse_at_center,black,transparent_78%)] absolute inset-0"
        aria-hidden
      />
      <div
        className="absolute -right-32 top-20 size-105 rounded-full border-2 border-volt/30 sm:size-140"
        aria-hidden
      />
      <div
        className="absolute -right-16 top-36 size-70 rounded-full border border-volt/15 sm:size-100"
        aria-hidden
      />
      <div
        className="bg-halftone absolute -left-10 bottom-24 size-48 opacity-50 sm:size-64"
        aria-hidden
      />
      <div
        className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto max-w-7xl px-5 pt-32 sm:px-8 sm:pt-40"
      >
        <motion.p
          variants={item}
          className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt sm:text-xs"
        >
          <span className="inline-block size-2 animate-pulse bg-volt" aria-hidden />
          The future is here. Be part of it.
        </motion.p>

        <motion.h1
          variants={item}
          className="mt-8 font-display uppercase leading-[0.82]"
        >
          <span className="block text-[clamp(4rem,14vw,12rem)]">Groovvee</span>
          <span className="block text-[clamp(4rem,14vw,12rem)]">
            <span className="text-volt">AI</span>{" "}
            <span className="text-outline-white">Fest.</span>
          </span>
        </motion.h1>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <motion.div variants={item} className="max-w-xl">
            <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
              {event.tagline}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              {event.description}
            </p>
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap gap-4">
            <ButtonLink href="/tickets">
              Get Your Ticket
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#about" variant="outline">
              Explore the Festival
            </ButtonLink>
          </motion.div>
        </div>

        <motion.div
          variants={item}
          className="mt-16 grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {meta.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-2 py-5 sm:px-6">
              <Icon className="size-5 shrink-0 text-volt" aria-hidden />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
