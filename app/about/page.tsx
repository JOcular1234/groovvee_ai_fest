import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { getPublishedCommunities } from "@/lib/public/communities";
import { getPublishedCompetitions } from "@/lib/public/competitions";
import { getPublishedEvents } from "@/lib/public/events";
import { getCityIndex } from "@/lib/public/locations";

export const metadata: Metadata = {
  title: "About",
  description:
    "GrooVVee AI Fest is a global AI ecosystem — student tribes, campus communities, creative and industry groups connected through events, competitions and shared curiosity.",
};

const PILLARS = [
  {
    title: "Communities",
    href: "/communities",
    tag: "Connect",
    description:
      "AI Student Tribes, Campus AI Communities and fifteen creative & industry groups — filmmakers, musicians, fashion, ads, real estate, legal, finance, architecture, construction, healthcare, telecom, education, sustainability, mobility and consumer products.",
  },
  {
    title: "Events",
    href: "/events",
    tag: "Gather",
    description:
      "Monthly community city events, hackathons and education sessions across the US, Africa and Europe — plus GrooVVee Fest, our semi-annual flagship festival in the USA, Africa and the UK.",
  },
  {
    title: "AI Hack Wars",
    href: "/hack-wars",
    tag: "Compete",
    description:
      "Our filmed build competition — solo or in teams of three, three rounds over thirty days, one winner. Plus open AI contests and community-vs-community showdowns.",
  },
  {
    title: "AI News",
    href: "/news",
    tag: "Learn",
    description:
      "Dispatches from the ecosystem — what communities are building, what the industry is doing, and what's coming next.",
  },
];

export default async function AboutPage() {
  const [communities, events, cityIndex, competitions] = await Promise.all([
    getPublishedCommunities(),
    getPublishedEvents(),
    getCityIndex(),
    getPublishedCompetitions(),
  ]);

  const stats = [
    { value: String(communities.length), label: "Communities" },
    { value: String(cityIndex.cities.length), label: "Cities worldwide" },
    { value: String(events.length), label: "Published events" },
    { value: String(competitions.length), label: "Competitions" },
  ];

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Who we are
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          The global AI ecosystem<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          GrooVVee connects student tribes, campus communities, creators and
          industry groups through events, competitions and shared curiosity —
          from Minneapolis to Lagos, Accra to Nairobi, London to the world.
        </p>

        {/* Live stats */}
        <dl className="mt-14 grid grid-cols-2 gap-px border border-white/10 bg-white/5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-panel p-6 sm:p-8">
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                {s.label}
              </dt>
              <dd className="mt-2 font-display text-5xl leading-none text-volt">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Mission */}
        <div className="mt-20 grid gap-10 lg:grid-cols-2">
          <div className="border border-white/10 bg-panel p-8 sm:p-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
              The mission
            </p>
            <h2 className="mt-3 font-display text-3xl uppercase leading-tight">
              Put a camera on the people building the future
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              AI is being shaped on campuses and in studios right now — by
              students running their first hackathon and by industry groups
              reinventing film, music, fashion and finance. GrooVVee exists to
              find them, connect them and film what happens when they collide.
            </p>
          </div>
          <div className="border border-white/10 bg-panel p-8 sm:p-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl uppercase leading-tight">
              Communities monthly, the world twice a year
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Local chapters gather every month — parties, hackathons and
              education sessions in cities across the US, Africa and beyond.
              Twice a year the whole ecosystem converges on GrooVVee Fest in
              the USA, Africa and the UK.
            </p>
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-20">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            What we do
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {PILLARS.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group border border-white/10 bg-panel p-8 transition-colors hover:border-volt/50"
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                  {p.tag}
                </p>
                <h3 className="mt-3 flex items-center gap-2 font-display text-3xl uppercase leading-none group-hover:text-volt">
                  {p.title}
                  <ArrowUpRight
                    className="size-5 text-muted transition-colors group-hover:text-volt"
                    aria-hidden
                  />
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {p.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 border border-white/10 bg-panel p-8 text-center sm:p-12">
          <h2 className="font-display text-3xl uppercase leading-none">
            Join the ecosystem<span className="text-volt">.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted">
            Find your community, come to an event, or enter AI Hack Wars —
            the door is open.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 bg-volt px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
            >
              Explore communities
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-white/25 px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
