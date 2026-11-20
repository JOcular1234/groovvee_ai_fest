"use client";

import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  CalendarDays,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { event } from "@/data/event";
import { formatEventDateTime } from "@/lib/datetime";
import { ButtonLink } from "@/components/ui/ButtonLink";

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
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-ink">
      <Image
        src="/groovvee-background.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink/95"
        aria-hidden
      />
      <div
        className="bg-grid mask-[radial-gradient(ellipse_80%_70%_at_50%_35%,black,transparent)] absolute inset-0 opacity-60"
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
          className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt"
        >
          <span className="inline-block size-2 bg-volt" aria-hidden />
          The future is here. Be part of it.
        </motion.p>

        <motion.h1
          variants={container}
          className="mt-10 font-display uppercase leading-[0.82] sm:mt-12"
        >
          <span className="block overflow-hidden">
            <motion.span
              variants={lineReveal}
              className="block text-[clamp(3.75rem,13.5vw,11.5rem)]"
            >
              Groovvee
              <Asterisk
                className="ml-2 inline-block size-[0.4em] align-top text-volt"
                strokeWidth={2.5}
                aria-hidden
              />
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              variants={lineReveal}
              className="block text-[clamp(3.75rem,13.5vw,11.5rem)]"
            >
              <span className="text-volt">AI</span> Fest.
            </motion.span>
          </span>
        </motion.h1>

        <div className="mt-auto flex flex-col gap-10 pt-14 lg:flex-row lg:items-end lg:justify-between">
          <motion.div variants={item} className="max-w-xl">
            <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
              {event.tagline}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              {event.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/tickets">
                Get Your Ticket
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/#about" variant="outline">
                Explore the Festival
              </ButtonLink>
            </div>
          </motion.div>

          <motion.div variants={item} className="w-full lg:max-w-sm">
            <Link
              href={card.href}
              className="group block border border-white/15 bg-panel transition-colors hover:border-volt"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
                  Next up
                </p>
                <ArrowUpRight
                  className="size-4 text-muted transition-colors group-hover:text-volt"
                  aria-hidden
                />
              </div>
              <div className="space-y-4 px-5 py-5">
                <p className="font-display text-2xl uppercase leading-tight">
                  {card.title}
                </p>
                <div className="space-y-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/80">
                  <p className="flex items-center gap-2.5">
                    <CalendarDays
                      className="size-3.5 shrink-0 text-volt"
                      aria-hidden
                    />
                    {card.date}
                  </p>
                  <p className="flex items-center gap-2.5">
                    <MapPin
                      className="size-3.5 shrink-0 text-volt"
                      aria-hidden
                    />
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
