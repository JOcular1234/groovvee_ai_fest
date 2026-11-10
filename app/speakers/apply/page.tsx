import type { Metadata } from "next";
import { connection } from "next/server";

import { ApplyForm } from "@/components/applications/ApplyForm";
import { issueFormToken } from "@/lib/form-token";

export const metadata: Metadata = {
  title: "Apply to Speak",
  description:
    "Apply to speak at GrooVVee AI Fest — share what you're building, questioning or reimagining in AI.",
};

// Issues a fresh signed form token per render.
export const instant = false;

export default async function ApplyToSpeakPage() {
  // issueFormToken uses unstable values (Date.now) — keep them request-time.
  await connection();
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Take the stage
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
          Apply to speak<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted">
          Tell us who you are and what you want to bring to the GrooVVee stage.
          Applications are reviewed by the curation team — no public listing.
        </p>
        <div className="mt-10">
          <ApplyForm token={issueFormToken()} />
        </div>
      </div>
    </section>
  );
}
