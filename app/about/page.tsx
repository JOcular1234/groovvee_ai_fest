import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { CollageBackground } from "@/components/ui/CollageBackground";

import { getPublishedCommunities } from "@/lib/public/communities";
import { getPublishedCompetitions } from "@/lib/public/competitions";
import { getPublishedEvents } from "@/lib/public/events";
import { getCityIndex } from "@/lib/public/locations";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "About",
  description:
    "GrooVVee AI Fest is a global AI ecosystem — student tribes, campus communities, creative and industry groups connected through events, competitions and shared curiosity.",
  path: "/about",
});

const PILLARS = [
  {
    title: "Communities",
    href: "/communities",
    tag: "Connect",
    description:
      "Student tribes, campus communities and fifteen creative and industry groups, from filmmakers to finance, healthcare to fashion.",
  },
  {
    title: "Events",
    href: "/events",
    tag: "Gather",
    description:
      "Monthly city events, hackathons and education sessions across the US, Africa and Europe, plus GrooVVee Fest twice a year.",
  },
  {
    title: "AI Hack Wars",
    href: "/hack-wars",
    tag: "Compete",
    description:
      "A filmed build competition: solo or teams of three, three rounds over thirty days, one winner.",
  },
  {
    title: "AI News",
    href: "/news",
    tag: "Learn",
    description:
      "What communities are building, what the industry is doing, and what's coming next.",
  },
];

const GROUPS = [
  "Filmmakers",
  "Musicians",
  "Fashion",
  "Advertising",
  "Real estate",
  "Legal",
  "Finance",
  "Architecture",
  "Construction",
  "Healthcare",
  "Telecom",
  "Education",
  "Sustainability",
  "Mobility",
  "Consumer products",
];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
// Slots in the year where the semi-annual Fest lands (visual rhythm only).
const FEST_SLOTS = new Set([5, 11]);

export default async function AboutPage() {
  const [communities, events, cityIndex, competitions] = await Promise.all([
    getPublishedCommunities(),
    getPublishedEvents(),
    getCityIndex(),
    getPublishedCompetitions(),
  ]);

  const stats = [
    { value: communities.length, label: "Communities" },
    { value: cityIndex.cities.length, label: "Cities" },
    { value: events.length, label: "Events" },
    { value: competitions.length, label: "Competitions" },
  ];

  return (
    <div className="relative overflow-hidden">
      <CollageBackground />

      {/* HERO */}
      <section className="relative px-5 pt-32 pb-16 sm:px-8 sm:pt-40 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="flex items-center gap-3 font-mono text-xs font-bold text-ink/60">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            About GrooVVee
          </p>
          <h1 className="mt-6 max-w-5xl font-display text-5xl uppercase leading-[0.92] text-ink sm:text-7xl lg:text-[8rem]">
            <span className="bg-volt px-2 [box-decoration-break:clone]">
              Where AI builders
            </span>{" "}
            meet, make and get filmed.
          </h1>
          <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-ink/70">
            Student tribes, campus communities, creators and industry groups,
            connected through events and competitions. From Minneapolis to
            Lagos, Accra to Nairobi, London to the world.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 border border-ink bg-ink px-7 py-4 font-mono text-xs font-bold text-volt transition-colors hover:bg-volt hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              Find your community
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 border border-ink bg-white/80 px-7 py-4 font-mono text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              See upcoming events
            </Link>
          </div>

          {/* Live stats: one strip, one row, no card chrome */}
          <dl className="mt-20 grid grid-cols-2 border-y-2 border-ink bg-white/90 backdrop-blur-sm sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`px-5 py-8 sm:px-8 ${
                  i > 0 ? "sm:border-l sm:border-ink/20" : ""
                } ${i % 2 === 1 ? "border-l border-ink/20 sm:border-l" : ""} ${
                  i > 1 ? "border-t border-ink/20 sm:border-t-0" : ""
                }`}
              >
                <dd className="font-display text-6xl leading-none text-ink sm:text-7xl">
                  {s.value}
                </dd>
                <dt className="mt-3 text-sm font-semibold text-ink/60">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* RHYTHM: the memorable moment */}
      <section className="relative px-5 py-20 sm:px-8 sm:py-28">
        <CollageBackground />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
            <div>
              <h2 className="font-display text-4xl uppercase leading-[0.95] text-ink sm:text-6xl">
                Local every <span className="bg-volt px-2 text-ink">month.</span>
                <br />
                Global twice a year.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-ink/70">
                Chapters gather monthly for parties, hackathons and education
                sessions. Twice a year, everyone converges on GrooVVee Fest in
                the USA, Africa and the UK.
              </p>
            </div>

            <div className="border border-ink/15 bg-white/95 p-6 backdrop-blur-sm sm:p-8">
              <ol
                className="grid grid-cols-12 gap-1.5 sm:gap-2"
                aria-label="A year of GrooVVee: monthly city events and two Fest weekends"
              >
                {MONTHS.map((m, i) => {
                  const fest = FEST_SLOTS.has(i);
                  return (
                    <li key={i} className="flex flex-col items-center gap-2">
                      <span
                        className={`w-full ${
                          fest
                            ? "h-28 border border-ink bg-volt sm:h-40"
                            : "h-12 bg-ink/15 sm:h-16"
                        }`}
                        aria-hidden
                      />
                      <span className="font-mono text-[11px] text-ink/50">
                        {m}
                      </span>
                      <span className="sr-only">
                        {fest ? "GrooVVee Fest" : "Community city events"}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink/70">
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 bg-ink/15" aria-hidden />
                  Community city events
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 border border-ink bg-volt" aria-hidden />
                  GrooVVee Fest
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="relative px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <h2 className="font-display text-4xl uppercase leading-[0.95] text-ink sm:text-6xl">
            Put a camera on the people building the future.
          </h2>
          <div className="space-y-6 text-lg leading-relaxed text-ink/75">
            <p>
              AI is being shaped on campuses and in studios right now, by
              students running their first hackathon and by industry groups
              reinventing film, music, fashion and finance.
            </p>
            <p className="font-semibold text-ink">
              GrooVVee exists to find them, connect them and film what happens
              when they collide.
            </p>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="relative px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl uppercase text-ink sm:text-4xl">
            What we do
          </h2>
          <div className="mt-8 grid gap-px border border-ink/20 bg-ink/20 md:grid-cols-2">
            {PILLARS.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group relative flex min-h-64 flex-col justify-between bg-white/95 p-8 backdrop-blur-sm transition-colors hover:bg-volt focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink sm:p-10"
              >
                <div className="flex items-start justify-between">
                  <span className="border border-ink px-2 py-0.5 font-mono text-xs font-bold text-ink">
                    {p.tag}
                  </span>
                  <ArrowUpRight
                    className="size-7 text-ink/30 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none"
                    aria-hidden
                  />
                </div>
                <div className="mt-10">
                  <h3 className="font-display text-4xl uppercase leading-none text-ink sm:text-5xl">
                    {p.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-relaxed text-ink/70 group-hover:text-ink/85">
                    {p.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRY GROUPS */}
      <section className="relative border-y border-ink/15 bg-white/90 px-5 py-16 backdrop-blur-sm sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-xl font-display text-3xl uppercase leading-tight text-ink sm:text-4xl">
              Fifteen creative and industry groups
            </h2>
            <Link
              href="/communities"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink underline decoration-volt decoration-[0.25em] underline-offset-4 hover:decoration-ink"
            >
              Browse all communities
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {GROUPS.map((g) => (
              <li
                key={g}
                className="border border-ink/30 px-4 py-2 text-sm font-semibold text-ink"
              >
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl border-2 border-ink bg-volt p-8 shadow-[10px_10px_0_0_var(--color-ink,#000)] sm:p-14">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <h2 className="font-display text-4xl uppercase leading-[0.95] text-ink sm:text-6xl">
                The door is open.
              </h2>
              <p className="mt-4 max-w-md font-medium text-ink/80">
                Find your community, come to an event, or enter AI Hack Wars.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                href="/communities"
                className="inline-flex items-center gap-2 border border-ink bg-ink px-7 py-4 font-mono text-xs font-bold text-volt transition-colors hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                Explore communities
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-ink px-7 py-4 font-mono text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}