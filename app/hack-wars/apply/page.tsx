import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight } from "lucide-react";

import { HackWarsApplyForm } from "@/components/hack-wars/ApplyForm";
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
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          AI Hack Wars
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
          Enter the arena<span className="text-volt">.</span>
        </h1>

        {competition ? (
          <>
            <p className="mt-6 max-w-2xl text-muted">
              Compete in <span className="text-white">{competition.title}</span>{" "}
              — solo or with a team of up to three. Applications are reviewed by
              the organizing team before entries are confirmed.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {FACTS.map((f) => (
                <li
                  key={f}
                  className="border border-white/15 px-3 py-1.5 text-xs text-white/80"
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
                <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                  What happens next
                </h2>
                <ol className="mt-4 border-l border-white/15">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="relative pb-8 pl-6 last:pb-0">
                      <span
                        className={`absolute -left-[5px] top-1.5 size-2.5 ${
                          i === 0 ? "bg-volt" : "border border-white/40 bg-ink"
                        }`}
                        aria-hidden
                      />
                      <p className="font-display text-xl uppercase leading-none text-white">
                        {s.title}
                      </p>
                      <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 text-sm text-muted">
                  Questions first?{" "}
                  <Link
                    href="/contact"
                    className={`text-volt hover:underline ${focusRing}`}
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
          <div className="mt-10 max-w-3xl border border-white/10 bg-panel p-8 sm:p-12">
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              <span className="inline-block size-2 border border-volt" aria-hidden />
              Registration closed
            </p>
            <h2 className="mt-5 font-display text-4xl uppercase leading-none sm:text-5xl">
              Not open right now<span className="text-volt">.</span>
            </h2>
            <p className="mt-5 max-w-lg text-muted">
              AI Hack Wars registration is not open right now. Check back when
              registration opens, or contact the team for updates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className={`inline-flex min-h-12 items-center gap-2 bg-volt px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`}
              >
                Contact the team
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/competitions"
                className={`inline-flex min-h-12 items-center border border-white/25 px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt ${focusRing}`}
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