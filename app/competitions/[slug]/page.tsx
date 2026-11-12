import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatEventDateTime } from "@/lib/datetime";
import { getCompetitionBySlug } from "@/lib/public/competitions";
import {
  COMPETITION_KIND_LABELS,
  COMPETITION_STATUS_LABELS,
} from "@/lib/validation/competition";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);
  if (!competition) return { title: "Competition" };
  return {
    title: competition.title,
    description: competition.description.slice(0, 160),
  };
}

// Dynamic slug params — renders per request over cached queries.
export const instant = false;

// Round dates formatted in the competition's timezone — built per render.
const roundDateFmt = (tz: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);
  if (!competition) notFound();

  const applyOpen =
    competition.kind === "HACK_WARS" &&
    competition.status === "REGISTRATION_OPEN";
  const dateFmt = roundDateFmt(competition.timezone);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/competitions"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All competitions
        </Link>

        <div className="mt-8">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            {COMPETITION_KIND_LABELS[competition.kind] ?? competition.kind}
            <span className="text-muted">
              · {COMPETITION_STATUS_LABELS[competition.status] ?? competition.status}
            </span>
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
            {competition.title}
          </h1>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="relative aspect-video overflow-hidden border border-white/10 bg-ink">
              {competition.imageUrl ? (
                <Image
                  src={competition.imageUrl}
                  alt={competition.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
                >
                  {competition.title.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <p className="mt-8 whitespace-pre-line leading-relaxed text-muted">
              {competition.description}
            </p>

            {competition.rounds.length > 0 && (
              <div className="mt-12">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
                  Rounds
                </p>
                <div className="mt-6 divide-y divide-white/5 border border-white/10 bg-panel">
                  {competition.rounds.map((r, i) => (
                    <div key={r.id} className="p-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                          R.{String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-display text-xl uppercase leading-tight">
                          {r.name}
                        </h3>
                      </div>
                      {(r.startsAt || r.endsAt) && (
                        <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-muted">
                          {r.startsAt ? dateFmt.format(r.startsAt) : "TBA"}
                          {" → "}
                          {r.endsAt ? dateFmt.format(r.endsAt) : "TBA"}
                        </p>
                      )}
                      {r.description && (
                        <p className="mt-3 text-sm leading-relaxed text-muted">
                          {r.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="self-start border border-white/10 bg-panel p-6 sm:p-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
              Status
            </p>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.15em] text-volt">
              {COMPETITION_STATUS_LABELS[competition.status] ?? competition.status}
            </p>

            {(competition.startsAt || competition.endsAt) && (
              <>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  When
                </p>
                <p className="mt-3 font-mono text-sm uppercase tracking-[0.15em] text-white">
                  {competition.startsAt
                    ? formatEventDateTime(
                        competition.startsAt,
                        competition.timezone
                      )
                    : "TBA"}
                </p>
                {competition.endsAt && (
                  <p className="mt-1 font-mono text-sm uppercase tracking-[0.15em] text-muted">
                    →{" "}
                    {formatEventDateTime(
                      competition.endsAt,
                      competition.timezone
                    )}
                  </p>
                )}
              </>
            )}

            {competition.prizeText && (
              <>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  Prize
                </p>
                <p className="mt-3 text-sm text-white">{competition.prizeText}</p>
              </>
            )}

            {competition.event && (
              <>
                <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                  Part of
                </p>
                <Link
                  href={`/events/${competition.event.slug}`}
                  className="mt-3 inline-block text-sm text-volt transition-colors hover:text-white"
                >
                  {competition.event.title}
                </Link>
              </>
            )}

            {applyOpen && (
              <Link
                href="/hack-wars/apply"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-volt px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
              >
                Apply now
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            )}
            {competition.rulesUrl && (
              <a
                href={competition.rulesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-white/25 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
              >
                Rules &amp; terms
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
