import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { getHackWarsCompetition } from "@/lib/public/competitions";
import { COMPETITION_STATUS_LABELS } from "@/lib/validation/competition";

export const metadata: Metadata = {
  title: "AI Hack Wars",
  description:
    "The flagship GrooVVee build competition — solo or teams of three, filmed over 30 days, three rounds, one winner.",
};

const STEPS = [
  {
    index: "01",
    title: "Enter solo or as a team",
    description:
      "Apply individually or bring a team of up to three builders. Tell us who you are in four sentences — prior TV or contest experience is a plus, not a requirement.",
  },
  {
    index: "02",
    title: "Build on camera",
    description:
      "The competition is filmed over 30 days — your process, your pivots and your wins, produced for the GrooVVee audience.",
  },
  {
    index: "03",
    title: "Three rounds, one winner",
    description:
      "Survive three rounds of judged build challenges. One builder or team takes the title and the prize.",
  },
];

const REQUIREMENTS = [
  "Email, phone and school required",
  "Major and graduation year optional",
  "Four sentences about you",
  "Prior TV or contest experience (optional)",
];

export default async function HackWarsPage() {
  const competition = await getHackWarsCompetition();
  const registrationOpen = competition?.status === "REGISTRATION_OPEN";
  const statusLabel = competition
    ? (COMPETITION_STATUS_LABELS[competition.status] ?? competition.status)
    : null;

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/competitions"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          ← All competitions
        </Link>

        <div className="mt-8">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            The flagship competition
            {statusLabel && (
              <span className="text-muted">· {statusLabel}</span>
            )}
          </p>
          <h1 className="mt-5 font-display text-6xl uppercase leading-[0.9] sm:text-8xl">
            AI Hack Wars<span className="text-volt">.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted">
            {competition?.description ??
              "The flagship GrooVVee build competition — solo or in teams of up to three."}
          </p>
          {competition?.prizeText && (
            <p className="mt-4 font-mono text-sm uppercase tracking-[0.2em] text-white">
              {competition.prizeText}
            </p>
          )}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.index}
              className="border border-white/10 bg-panel p-6 transition-colors hover:border-volt/50"
            >
              <p className="font-display text-4xl text-outline-volt">
                {s.index}
              </p>
              <h2 className="mt-4 font-display text-xl uppercase leading-tight">
                {s.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {s.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 border border-white/10 bg-panel p-8 sm:p-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            What the application asks
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {REQUIREMENTS.map((r) => (
              <li
                key={r}
                className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white/80"
              >
                <span className="inline-block size-1.5 bg-volt" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            {registrationOpen ? (
              <Link
                href="/hack-wars/apply"
                className="inline-flex items-center gap-2 bg-volt px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
              >
                Apply now
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <p className="text-sm text-muted">
                Registration is not open right now.{" "}
                <Link
                  href="/contact"
                  className="text-volt transition-colors hover:underline"
                >
                  Contact the team
                </Link>{" "}
                for updates on the next edition.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
