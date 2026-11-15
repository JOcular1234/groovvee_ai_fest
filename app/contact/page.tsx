import { connection } from "next/server";
import { ArrowUpRight, Mail } from "lucide-react";

import { ContactForm } from "@/components/contact/ContactForm";
import { issueFormToken } from "@/lib/form-token";
import { event } from "@/data/event";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with the GrooVVee AI Fest team — partnerships, press, events, communities and speaking enquiries.",
  path: "/contact",
});

// Issues a fresh signed form token per render.
export const instant = false;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const TOPICS = [
  {
    title: "Partnerships",
    desc: "Sponsor, collaborate or build something with us.",
  },
  {
    title: "Press",
    desc: "Media enquiries, interviews and coverage.",
  },
  {
    title: "Events",
    desc: "Questions about GrooVVee events and AI Fest.",
  },
  {
    title: "Communities",
    desc: "Start, join or grow a campus or creative AI group.",
  },
  {
    title: "Speaking",
    desc: "Pitch a talk, workshop or session.",
  },
];

export default async function ContactPage() {
  // issueFormToken uses unstable values (Date.now) — keep them request-time.
  await connection();
  return (
    // overflow-x-clip (not hidden) so the left column can stay sticky
    <section className="relative overflow-x-clip px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[2fr_3fr] lg:gap-20">
        {/* Left: context */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            Say hello
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
            Contact<span className="text-volt">.</span>
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Questions, partnerships, press or community ideas — send us a
            message and the right person will get back to you.
          </p>

          <a
            href={`mailto:${event.contactEmail}`}
            className={`group mt-8 flex items-center gap-4 border border-white/15 bg-panel p-4 transition-colors hover:border-volt ${focusRing}`}
          >
            <span
              className="grid size-11 shrink-0 place-items-center bg-volt text-ink"
              aria-hidden
            >
              <Mail className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Prefer email?</span>
              <span className="block truncate font-semibold text-white transition-colors group-hover:text-volt">
                {event.contactEmail}
              </span>
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-muted transition-colors group-hover:text-volt"
              aria-hidden
            />
          </a>

          <div className="mt-12">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              What we can help with
            </h2>
            <ol className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {TOPICS.map((t, i) => (
                <li key={t.title} className="flex gap-4 py-4">
                  <span className="pt-0.5 font-mono text-xs font-bold text-volt">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-xl uppercase leading-none text-white">
                      {t.title}
                    </p>
                    <p className="mt-1.5 text-sm text-muted">{t.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: form */}
        <div id="message">
          <div className="flex items-baseline gap-4 border-b border-white/10 pb-5">
            <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
              Send a message
            </h2>
          </div>
          <div className="mt-8">
            <ContactForm token={issueFormToken()} />
          </div>
        </div>
      </div>
    </section>
  );
}