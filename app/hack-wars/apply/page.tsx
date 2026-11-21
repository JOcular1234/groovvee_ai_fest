import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight } from "lucide-react";

import { HackWarsApplyForm } from "@/components/hack-wars/ApplyForm";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { db, withDbRetry } from "@/lib/db";
import { findOpenHackWarsCompetition } from "@/lib/hack-wars";
import { issueFormToken } from "@/lib/form-token";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Apply — AI Hack Wars",
  description:
    "Enter AI Hack Wars at GrooVVee AI Fest — compete solo or bring a team of up to three builders.",
  path: "/hack-wars/apply",
});

// Issues a fresh signed form token per render.
export const instant = false;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const FACTS = ["Solo or team of up to 3", "Ages 16+", "Reviewed by organizers"];

const STEPS = [
  {
    title: "Apply",
    desc: "Fill in the form, solo or with up to two teammates.",
  },
  {
    title: "Review",
    desc: "The organizing team reviews every application.",
  },
  {
    title: "Next steps",
    desc: "We reach out to confirm your entry.",
  },
];

export default async function HackWarsApplyPage() {
  await connection();
  const competition = await withDbRetry(() =>
    findOpenHackWarsCompetition(db)
  );

  return (
    // overflow-x-clip (not hidden) so the sidebar can stay sticky
    <section className="relative overflow-x-clip px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-6xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          AI Hack Wars
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
          Enter the <span className="bg-volt px-2 text-ink">arena.</span>
        </h1>

        {competition ? (
          <>
            <p className="mt-6 max-w-2xl font-medium text-ink/70">
              Compete in <span className="font-semibold text-ink">{competition.title}</span>{" "}
              — solo or with a team of up to three. Applications are reviewed by
              the organizing team before entries are confirmed.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {FACTS.map((f) => (
                <li
                  key={f}
                  className="border border-ink/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-ink/80"
                >
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-12 grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
              {/* What happens next — after the form on mobile, beside it on desktop */}
              <aside
                aria-label="What happens next"
                className="order-last lg:order-first lg:sticky lg:top-32 lg:self-start"
              >
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60">
                  What happens next
                </h2>
                <ol className="mt-4 border-l border-ink/20">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="relative pb-8 pl-6 last:pb-0">
                      <span
                        className={`absolute -left-[5px] top-1.5 size-2.5 ${
                          i === 0 ? "bg-volt" : "border border-ink/40 bg-white"
                        }`}
                        aria-hidden
                      />
                      <p className="font-display text-xl uppercase leading-none text-ink">
                        {s.title}
                      </p>
                      <p className="mt-1.5 text-sm text-ink/70">{s.desc}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 text-sm text-ink/70">
                  Questions first?{" "}
                  <Link
                    href="/contact"
                    className={`font-medium text-ink underline decoration-volt decoration-2 underline-offset-2 hover:bg-volt ${focusRing}`}
                  >
                    Contact the team
                  </Link>
                  .
                </p>
              </aside>

              <HackWarsApplyForm token={issueFormToken()} />
            </div>
          </>
        ) : (
          <div className="mt-10 max-w-3xl border border-ink/15 bg-white/95 p-8 backdrop-blur-sm sm:p-12">
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              <span className="inline-block size-2 border border-ink" aria-hidden />
              Registration closed
            </p>
            <h2 className="mt-5 font-display text-4xl uppercase leading-none text-ink sm:text-5xl">
              Not open right now.
            </h2>
            <p className="mt-5 max-w-lg text-ink/70">
              AI Hack Wars registration is not open right now. Check back when
              registration opens, or contact the team for updates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className={`inline-flex min-h-12 items-center gap-2 border border-ink bg-ink px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel ${focusRing}`}
              >
                Contact the team
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/competitions"
                className={`inline-flex min-h-12 items-center border border-ink/25 px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-volt ${focusRing}`}
              >
                See competitions
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}