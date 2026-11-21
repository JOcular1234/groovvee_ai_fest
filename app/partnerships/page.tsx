import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { CollageBackground } from "@/components/ui/CollageBackground";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Partnerships & Sponsorships",
  description:
    "Partner with GrooVVee AI Fest — monthly community event sponsorships, semi-annual festival partnerships and studio participation packages.",
  path: "/partnerships",
});

const CATEGORIES = [
  {
    title: "Community City Events",
    tag: "Monthly",
    description:
      "Monthly AI community events, hackathons and education sessions hosted across our city chapters — from Minneapolis to Lagos, Accra to Nairobi. Put your brand in front of local builders, students and creatives every month.",
    points: [
      "Monthly recurring visibility",
      "Local chapter audiences worldwide",
      "Hackathons, workshops and meetups",
    ],
  },
  {
    title: "GrooVVee AI Fest",
    tag: "Semi-Annual",
    description:
      "Our flagship semi-annual festival across the USA, Africa and the UK — the biggest stage in the GrooVVee ecosystem. Headline the event where the AI community gathers twice a year.",
    points: [
      "Flagship festival audience",
      "USA, Africa and UK editions",
      "Headline and category sponsorships",
    ],
  },
];

const STUDIO_TIERS = [
  {
    name: "Independent Studio",
    price: "$700",
    note: "per participation",
    description:
      "For independent studios and small teams ready to show what they're building.",
    features: [
      "Exhibit and demo space",
      "Featured in event programme",
      "Community showcase listing",
    ],
    featured: false,
  },
  {
    name: "Established Studio",
    price: "$5,000",
    note: "per participation",
    description:
      "For established studios looking for premium placement and deeper ecosystem access.",
    features: [
      "Premium exhibit placement",
      "Speaking slot consideration",
      "Featured partner listing",
      "Priority access to talent pipeline",
    ],
    featured: true,
  },
];

export default function PartnershipsPage() {
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Build with us
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-7xl">
          <span className="bg-volt px-2 text-ink">Partnerships.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-medium text-ink/70">
          Two ways to put your brand inside the GrooVVee ecosystem — plus
          participation packages for studios ready to take the stage.
        </p>

        {/* Sponsorship categories */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="border border-ink/15 bg-white/95 p-8 backdrop-blur-sm transition-colors hover:border-ink/40"
            >
              <p className="w-fit bg-volt px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
                {c.tag} sponsorship
              </p>
              <h2 className="mt-3 font-display text-3xl uppercase leading-none text-ink">
                {c.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/70">
                {c.description}
              </p>
              <ul className="mt-6 space-y-2.5">
                {c.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/80"
                  >
                    <span className="inline-block size-1.5 bg-volt" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Studio participation */}
        <div className="mt-20">
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            Studio participation
          </p>
          <h2 className="mt-4 font-display text-4xl uppercase leading-none text-ink sm:text-5xl">
            Take the <span className="bg-volt px-2 text-ink">stage.</span>
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {STUDIO_TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative border p-8 backdrop-blur-sm transition-colors ${
                  t.featured
                    ? "border-ink bg-volt text-ink shadow-[8px_8px_0_0_currentColor]"
                    : "border-ink/15 bg-white/95 hover:border-ink/40"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-px right-6 border border-ink bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-volt">
                    Premium
                  </span>
                )}
                <h3 className="font-display text-2xl uppercase text-ink">{t.name}</h3>
                <p className={`mt-2 text-sm ${t.featured ? "text-ink/75" : "text-ink/70"}`}>{t.description}</p>
                <p className="mt-6 font-display text-6xl leading-none text-ink">
                  {t.price}
                  <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.15em] text-ink/60">
                    {t.note}
                  </span>
                </p>
                <ul className="mt-8 space-y-2.5 border-t border-ink/15 pt-6">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/80"
                    >
                      <span className="inline-block size-1.5 bg-ink" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border border-ink/15 bg-white/95 p-8 text-center backdrop-blur-sm sm:p-12">
          <h2 className="font-display text-3xl uppercase leading-none text-ink">
            Ready to partner?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink/70">
            Tell us which category fits — we&apos;ll send the full partnership
            deck and talk through placement.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 border border-ink bg-ink px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel"
          >
            Get in touch
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
