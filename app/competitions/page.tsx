import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/Reveal";
import { getPublishedCompetitions } from "@/lib/public/competitions";
import {
  COMPETITION_KIND_LABELS,
  COMPETITION_STATUS_LABELS,
} from "@/lib/validation/competition";

export const metadata: Metadata = {
  title: "Competitions",
  description:
    "AI Hack Wars, open AI contests and community-vs-community showdowns — prove it on the GrooVVee stage.",
};

type PublicCompetition = Awaited<
  ReturnType<typeof getPublishedCompetitions>
>[number];

function StatusPill({ status }: { status: string }) {
  const live = status === "REGISTRATION_OPEN" || status === "RUNNING";
  return (
    <span
      className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${
        live ? "bg-volt/15 text-volt" : "bg-white/10 text-muted"
      }`}
    >
      {COMPETITION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function CompetitionCard({
  competition,
  index,
}: {
  competition: PublicCompetition;
  index: number;
}) {
  return (
    <Reveal delay={0.06 * (index % 3)}>
      <Link
        href={
          competition.kind === "HACK_WARS"
            ? "/hack-wars"
            : `/competitions/${competition.slug}`
        }
        className="group flex h-full flex-col border border-white/10 bg-panel transition-colors hover:border-volt/60"
      >
        <div className="relative aspect-video overflow-hidden bg-ink">
          <div
            className="bg-halftone absolute right-0 top-0 z-10 size-20 opacity-40"
            aria-hidden
          />
          {competition.imageUrl ? (
            <Image
              src={competition.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-display text-6xl text-outline-volt"
            >
              {competition.title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
              {COMPETITION_KIND_LABELS[competition.kind] ?? competition.kind}
            </p>
            <StatusPill status={competition.status} />
          </div>
          <h3 className="mt-3 font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt">
            {competition.title}
          </h3>
          {competition.prizeText && (
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-white">
              {competition.prizeText}
            </p>
          )}
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
            {competition.description}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}

const SECTIONS = [
  {
    kind: "CONTEST",
    title: "AI Contests",
    blurb: "Open challenges for builders of every level.",
  },
  {
    kind: "COMMUNITY_CONTEST",
    title: "Community Contests",
    blurb: "Community-vs-community showdowns between GrooVVee groups.",
  },
];

export default async function CompetitionsPage() {
  const competitions = await getPublishedCompetitions();
  const hackWars = competitions.filter((c) => c.kind === "HACK_WARS");
  const byKind = (kind: string) =>
    competitions.filter((c) => c.kind === kind);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Prove it
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Competitions<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          AI Hack Wars, open AI contests and community-vs-community showdowns
          — brackets, challenges and prizes on the GrooVVee stage.
        </p>

        {/* AI Hack Wars — the flagship */}
        <div className="mt-16">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
            Flagship
          </p>
          {hackWars.length === 0 ? (
            <div className="mt-6 border border-white/10 bg-panel p-10 text-center">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
                AI Hack Wars
              </p>
              <p className="mx-auto mt-4 max-w-md text-muted">
                Solo or teams of three, filmed over 30 days, three rounds, one
                winner. The next edition is being scheduled.
              </p>
            </div>
          ) : (
            hackWars.map((c) => (
              <div
                key={c.id}
                className="group mt-6 grid overflow-hidden border border-volt/40 bg-panel transition-colors hover:border-volt lg:grid-cols-[3fr_2fr]"
              >
                <div className="relative min-h-64 bg-ink lg:min-h-96">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.title}
                      fill
                      priority
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
                    >
                      HW
                    </span>
                  )}
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-10">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
                      AI Hack Wars
                    </p>
                    <StatusPill status={c.status} />
                  </div>
                  <h2 className="mt-4 font-display text-3xl uppercase leading-tight sm:text-4xl">
                    {c.title}
                  </h2>
                  {c.prizeText && (
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-white">
                      {c.prizeText}
                    </p>
                  )}
                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted">
                    {c.description}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    {c.status === "REGISTRATION_OPEN" && (
                      <Link
                        href="/hack-wars/apply"
                        className="inline-flex items-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
                      >
                        Apply now
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                    )}
                    <Link
                      href="/hack-wars"
                      className="inline-flex items-center gap-2 border border-white/25 px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
                    >
                      How it works
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contests + community contests */}
        {SECTIONS.map((section) => {
          const items = byKind(section.kind);
          return (
            <div key={section.kind} className="mt-16">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                {section.title}
              </p>
              {items.length === 0 ? (
                <div className="mt-6 border border-white/10 bg-panel p-10 text-center">
                  <p className="mx-auto max-w-md text-muted">
                    {section.blurb} Announcing soon.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((c, i) => (
                    <CompetitionCard key={c.id} competition={c} index={i} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
