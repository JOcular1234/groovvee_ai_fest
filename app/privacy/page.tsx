import type { Metadata } from "next";
import Link from "next/link";

import { event } from "@/data/event";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What GrooVVee AI Fest collects, why, how long it's kept, and how to access or delete your data.",
};

const EFFECTIVE_DATE = "November 2026";

const COLLECTED = [
  {
    title: "Event registration",
    desc: "Name, email address and optional organization — used to confirm and manage your registration and send event information.",
  },
  {
    title: "AI Hack Wars applications",
    desc: "Name, email, phone number, school or institution, field of study, graduation year, your answers and (for teams) your teammates' names, emails and schools — used to review entries and run the competition.",
  },
  {
    title: "Speaker applications",
    desc: "Name, email, organization, talk details, bio and links — used to review submissions and plan the programme.",
  },
  {
    title: "Contact messages",
    desc: "Name, email and message content — used to respond to your enquiry.",
  },
  {
    title: "Chat assistant",
    desc: "Messages you send to the site chat are processed to generate a reply. Avoid sharing personal details there.",
  },
];

const SHARING = [
  {
    title: "Neon",
    desc: "Database hosting — all form submissions are stored in our Neon PostgreSQL database.",
  },
  {
    title: "Google",
    desc: "Gmail API sends our transactional email (confirmations and notifications); Gemini processes chat assistant messages.",
  },
  {
    title: "Vercel",
    desc: "Website hosting and request handling.",
  },
];

const RIGHTS = [
  "Ask for a copy of the personal data we hold about you",
  "Ask us to correct inaccurate details",
  "Ask us to delete your data — including a pending or confirmed registration",
  "Object to how we use your data",
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-white/10 pt-8">
      <h2 className="font-display text-2xl uppercase leading-none text-white sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <section className="relative overflow-x-clip px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Your data
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
          Privacy policy<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted">
          Groovvee AI Fest is organized by Black Bumble Solutions. This page
          explains what we collect when you use this site, why, how long we
          keep it, and how to reach us about your data. Effective{" "}
          {EFFECTIVE_DATE}.
        </p>

        <div className="mt-14 space-y-12">
          <Section id="collect" title="What we collect">
            <p>
              We only collect what you give us through forms on this site —
              there is no analytics or behavioural tracking.
            </p>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {COLLECTED.map((c, i) => (
                <li key={c.title} className="flex gap-4 py-4">
                  <span className="pt-0.5 font-mono text-xs font-bold text-volt">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{c.title}</p>
                    <p className="mt-1">{c.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="use" title="How we use it">
            <p>
              We use your details only for the purpose you submitted them for:
              registering you for events, reviewing applications, running AI
              Hack Wars, and replying to messages. We may email you about the
              specific event or application you contacted us about — we do not
              send marketing mail or sell your data to anyone.
            </p>
            <p>
              Event registrations use double opt-in: nothing is confirmed until
              you click the link we email you.
            </p>
          </Section>

          <Section id="sharing" title="Who processes it">
            <p>
              A small number of providers process data on our behalf:
            </p>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {SHARING.map((s, i) => (
                <li key={s.title} className="flex gap-4 py-4">
                  <span className="pt-0.5 font-mono text-xs font-bold text-volt">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="mt-1">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="retention" title="How long we keep it">
            <p>
              <span className="font-semibold text-white">
                Unconfirmed registrations are deleted automatically after 30
                days.
              </span>{" "}
              If you register but never click the confirmation link, your
              details don't stay in our system.
            </p>
            <p>
              Confirmed registrations, applications and contact messages are
              kept while the event cycle they're part of is active, and for up
              to 24 months afterwards for event administration and records. You
              can ask for earlier deletion at any time.
            </p>
          </Section>

          <Section id="cookies" title="Cookies">
            <p>
              This site sets no advertising, analytics or tracking cookies. The
              only cookies are the admin area's sign-in session and short-lived
              security tokens used by forms — none of them track visitors.
            </p>
          </Section>

          <Section id="age" title="Age">
            <p>
              AI Hack Wars applicants must be 16 or older. If you are a parent
              or guardian and believe a child has submitted personal data, email
              us and we will delete it.
            </p>
          </Section>

          <Section id="rights" title="Your rights">
            <p>
              Depending on where you live (GDPR, CCPA and similar laws), you
              can:
            </p>
            <ul className="space-y-2">
              {RIGHTS.map((r) => (
                <li key={r} className="flex gap-3">
                  <span
                    className="mt-2 inline-block size-1.5 shrink-0 bg-volt"
                    aria-hidden
                  />
                  {r}
                </li>
              ))}
            </ul>
            <p>
              For any of these, email{" "}
              <a
                href={`mailto:${event.contactEmail}`}
                className={`text-volt hover:underline ${focusRing}`}
              >
                {event.contactEmail}
              </a>
              . We respond within 30 days. California residents: we do not sell
              or share personal information as defined by the CCPA.
            </p>
          </Section>

          <Section id="security" title="Security">
            <p>
              Submissions are encrypted in transit, stored access is restricted
              to the organizing team, and admin access requires strong
              authentication. No method is perfectly secure, but we take
              reasonable technical and organizational measures to protect your
              data.
            </p>
            <p>
              If this policy changes, the updated version will be posted on this
              page. Questions?{" "}
              <Link
                href="/contact"
                className={`text-volt hover:underline ${focusRing}`}
              >
                Contact us
              </Link>
              .
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
}
