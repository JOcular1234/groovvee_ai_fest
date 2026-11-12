"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Building2,
  CalendarDays,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
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
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.5 });
  const glow = useMotionTemplate`radial-gradient(560px circle at ${sx}px ${sy}px, rgb(255 214 0 / 0.07), transparent 65%)`;

  function handleMouseMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  const cardTitle = nextEvent ? nextEvent.title : "Details dropping soon";
  const cardDate = nextEvent
    ? formatEventDateTime(new Date(nextEvent.iso), nextEvent.timezone)
    : event.dateDisplay;
  const cardLocation = nextEvent
    ? nextEvent.isOnline
      ? "Online"
      : [nextEvent.venue, nextEvent.city].filter(Boolean).join(" · ") ||
        "Location TBA"
    : event.location;
  const cardHref = nextEvent ? `/events/${nextEvent.slug}` : "/events";

  const meta = [
    { icon: CalendarDays, label: "Date", value: cardDate },
    {
      icon: Building2,
      label: "Venue",
      value: nextEvent
        ? nextEvent.isOnline
          ? "Online"
          : nextEvent.venue ?? "To be announced"
        : event.venue,
    },
    {
      icon: MapPin,
      label: "Location",
      value: nextEvent
        ? (nextEvent.city ??
          (nextEvent.isOnline ? "Worldwide" : "To be announced"))
        : event.location,
    },
  ];

  return (
    <section
      className="relative flex min-h-svh flex-col overflow-hidden bg-ink"
      onMouseMove={handleMouseMove}
    >
      <div
        className="bg-grid mask-[radial-gradient(ellipse_80%_70%_at_50%_35%,black,transparent)] absolute inset-0"
        aria-hidden
      />
      <div
        className="absolute right-0 top-0 size-[38rem] bg-[radial-gradient(circle_at_center,rgb(255_214_0/0.07),transparent_62%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: glow }}
        aria-hidden
      />
      <div
        className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
      />
      <p
        className="absolute right-6 top-1/2 hidden -translate-y-1/2 font-mono text-[10px] font-bold uppercase tracking-[0.5em] text-white/25 [writing-mode:vertical-rl] 2xl:block"
        aria-hidden
      >
        Creativity × Artificial Intelligence
      </p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex w-full flex-1 flex-col border-x border-white/10"
      >
        <div className="flex flex-1 flex-col px-5 pt-28 sm:px-10 sm:pt-36 2xl:px-16">
          <motion.div
            variants={item}
            className="flex items-center justify-between gap-6 border-b border-white/10 pb-5"
          >
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              <span
                className="inline-block size-2 animate-pulse bg-volt"
                aria-hidden
              />
              The future is here. Be part of it.
            </p>
            <p
              className="hidden font-mono text-[11px] uppercase tracking-[0.3em] text-muted sm:block"
              aria-hidden
            >
              Vol. 01 — Inaugural edition
            </p>
          </motion.div>

          <motion.h1
            variants={container}
            className="mt-10 font-display uppercase leading-[0.82] sm:mt-14"
          >
            <span className="block overflow-hidden">
              <motion.span
                variants={lineReveal}
                className="block text-[clamp(3.75rem,13.5vw,11.5rem)]"
              >
                Groovvee
                <motion.span
                  className="ml-2 inline-block align-top text-volt"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                  aria-hidden
                >
                  <Asterisk className="size-[0.45em]" strokeWidth={2.5} />
                </motion.span>
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                variants={lineReveal}
                className="block text-[clamp(3.75rem,13.5vw,11.5rem)]"
              >
                <span className="text-volt">AI</span>{" "}
                <span className="text-outline-white">Fest.</span>
              </motion.span>
            </span>
          </motion.h1>

          <div className="mt-auto flex flex-col gap-10 pb-10 pt-14 lg:flex-row lg:items-end lg:justify-between">
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
              <div className="border border-white/15 bg-panel/50 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
                    Next up
                  </p>
                  <ArrowUpRight className="size-4 text-muted" aria-hidden />
                </div>
                <div className="px-5 py-5">
                  <p className="font-display text-2xl uppercase leading-tight">
                    {cardTitle}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/80">
                      <CalendarDays
                        className="size-3.5 shrink-0 text-volt"
                        aria-hidden
                      />
                      {cardDate}
                    </p>
                    <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/80">
                      <MapPin
                        className="size-3.5 shrink-0 text-volt"
                        aria-hidden
                      />
                      {cardLocation}
                    </p>
                  </div>
                </div>
                <Link
                  href={cardHref}
                  className="group flex items-center justify-between border-t border-white/10 px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-volt hover:text-ink"
                >
                  Event details
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          variants={item}
          className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4"
        >
          {meta.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 bg-ink px-5 py-5 sm:px-8"
            >
              <Icon className="size-5 shrink-0 text-volt" aria-hidden />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            </div>
          ))}
          <Link
            href="/#about"
            className="group flex items-center gap-4 bg-ink px-5 py-5 transition-colors hover:bg-volt hover:text-ink sm:px-8"
          >
            <ArrowDown
              className="size-5 shrink-0 text-volt transition-all group-hover:translate-y-0.5 group-hover:text-ink"
              aria-hidden
            />
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted transition-colors group-hover:text-ink/60">
                Scroll
              </p>
              <p className="mt-1 text-sm font-semibold">Explore the fest</p>
            </div>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
