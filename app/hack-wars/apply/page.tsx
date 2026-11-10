import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { HackWarsApplyForm } from "@/components/hack-wars/ApplyForm";
import { db, withDbRetry } from "@/lib/db";
import { findOpenHackWarsCompetition } from "@/lib/hack-wars";
import { issueFormToken } from "@/lib/form-token";

export const metadata: Metadata = {
  title: "Apply — AI Hack Wars",
  description:
    "Enter AI Hack Wars at GrooVVee AI Fest — compete solo or bring a team of up to three builders.",
};

// Issues a fresh signed form token per render.
export const instant = false;

export default async function HackWarsApplyPage() {
  await connection();
  const competition = await withDbRetry(() =>
    findOpenHackWarsCompetition(db)
  );

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          AI Hack Wars
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
          Enter the arena<span className="text-volt">.</span>
        </h1>

        {competition ? (
          <>
            <p className="mt-6 max-w-xl text-muted">
              Compete in <span className="text-white">{competition.title}</span>{" "}
              — solo or with a team of up to three. Applications are reviewed by
              the organizing team before entries are confirmed.
            </p>
            <div className="mt-10">
              <HackWarsApplyForm token={issueFormToken()} />
            </div>
          </>
        ) : (
          <div className="mt-10 border border-white/10 bg-panel p-10 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Registration closed
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              AI Hack Wars registration is not open right now. Check back when
              registration opens, or{" "}
              <Link href="/contact" className="text-volt hover:underline">
                contact the team
              </Link>{" "}
              for updates.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
