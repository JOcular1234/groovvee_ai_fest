import type { Metadata } from "next";
import { connection } from "next/server";

import { ContactForm } from "@/components/contact/ContactForm";
import { issueFormToken } from "@/lib/form-token";
import { event } from "@/data/event";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the GrooVVee AI Fest team — partnerships, press, events, communities and speaking enquiries.",
};

// Issues a fresh signed form token per render.
export const instant = false;

export default async function ContactPage() {
  // issueFormToken uses unstable values (Date.now) — keep them request-time.
  await connection();
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Say hello
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
          Contact<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted">
          Questions, partnerships, press or community ideas — send us a message
          and the right person will get back to you. You can also email{" "}
          <a
            href={`mailto:${event.contactEmail}`}
            className="text-volt hover:underline"
          >
            {event.contactEmail}
          </a>
          .
        </p>
        <div className="mt-10">
          <ContactForm token={issueFormToken()} />
        </div>
      </div>
    </section>
  );
}
