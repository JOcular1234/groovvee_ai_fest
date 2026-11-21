"use client";

import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  CalendarDays,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { event } from "@/data/event";
import { formatEventDateTime } from "@/lib/datetime";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CollageBackground } from "@/components/ui/CollageBackground";

export type HeroEvent = {
  title: string;
  slug: string;
  iso: string;
  timezone: string;
  venue: string | null;
  city: string | null;
  isOnline: boolean;
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const lineReveal: Variants = {
  hidden: { y: "112%" },
  show: { y: "0%", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero({ nextEvent }: { nextEvent: HeroEvent | null }) {
  const card = nextEvent
    ? {
        title: nextEvent.title,
        date: formatEventDateTime(new Date(nextEvent.iso), nextEvent.timezone),
        location: nextEvent.isOnline
          ? "Online"
          : [nextEvent.venue, nextEvent.city].filter(Boolean).join(" · ") ||
            "Location TBA",
        href: `/events/${nextEvent.slug}`,
      }
    : {
        title: "Details dropping soon",
        date: event.dateDisplay,
        location: event.location,
        href: "/events",
      };

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden">
      <CollageBackground mute="bg-white/40" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-volt/60"
        aria-hidden
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-1 flex-col px-5 pt-28 pb-12 sm:px-10 sm:pt-36 2xl:px-16"
      >
        <motion.p
          variants={item}
          className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink"
        >
          <span className="inline-block size-2 bg-ink" aria-hidden />
          The future is here. Be part of it.
        </motion.p>

        <motion.h1
          variants={container}
          className="mt-10 font-display uppercase leading-[0.82] sm:mt-12"
        >
          <span className="block overflow-hidden">
            <motion.span
              variants={lineReveal}
              className="block text-[clamp(3.5rem,11vw,9.5rem)] text-ink"
            >
              Groovvee
              <Asterisk
                className="ml-2 inline-block size-[0.4em] align-top"
                strokeWidth={2.5}
                aria-hidden
              />
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              variants={lineReveal}
              className="block text-[clamp(3.5rem,11vw,9.5rem)] text-ink"
            >
              AI Fest.
            </motion.span>
          </span>
        </motion.h1>

        <div className="mt-auto flex flex-col gap-10 pt-14 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            variants={item}
            className="max-w-2xl border border-ink/15 bg-white/95 p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm"
          >
            <h2 className="text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {event.tagline}
            </h2>
            <p className="mt-4 leading-relaxed text-ink/60">
              {event.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/tickets" variant="dark">
                Get Your Ticket
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/#about" variant="outlineDark">
                Explore the Festival
              </ButtonLink>
            </div>
          </motion.div>

          <motion.div variants={item} className="w-full lg:max-w-xs">
            <Link
              href={card.href}
              className="group block border border-ink/15 bg-white/95 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors hover:border-ink/40"
            >
              <div className="flex items-center justify-between border-b border-ink/15 px-4 py-2.5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink/60">
                  Next up
                </p>
                <ArrowUpRight
                  className="size-4 text-ink/40 transition-colors group-hover:text-ink"
                  aria-hidden
                />
              </div>
              <div className="space-y-3 px-4 py-4">
                <p className="font-display text-xl uppercase leading-tight text-ink">
                  {card.title}
                </p>
                <div className="space-y-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/70">
                  <p className="flex items-center gap-2.5">
                    <span
                      className="grid size-6 shrink-0 place-items-center bg-volt"
                      aria-hidden
                    >
                      <CalendarDays className="size-3.5 text-ink" aria-hidden />
                    </span>
                    {card.date}
                  </p>
                  <p className="flex items-center gap-2.5">
                    <span
                      className="grid size-6 shrink-0 place-items-center bg-volt"
                      aria-hidden
                    >
                      <MapPin className="size-3.5 text-ink" aria-hidden />
                    </span>
                    {card.location}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
