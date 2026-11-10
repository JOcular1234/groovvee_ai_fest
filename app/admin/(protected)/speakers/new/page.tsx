import type { Metadata } from "next";

import { SpeakerForm } from "@/components/admin/SpeakerForm";

export const metadata: Metadata = {
  title: "New Speaker · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function NewSpeakerPage() {
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Speakers
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add speaker<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <SpeakerForm />
        </div>
      </div>
    </section>
  );
}
