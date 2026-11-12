import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/server";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Reads cookies() — must render per-request, never prerendered.
export const instant = false;

const SECTIONS: {
  group: string;
  cards: { href: string; title: string; description: string }[];
}[] = [
  {
    group: "Content",
    cards: [
      {
        href: "/admin/speakers",
        title: "Speakers",
        description: "Create, publish and order the speaker lineup.",
      },
      {
        href: "/admin/topics",
        title: "Topics",
        description: "Curate the festival's subject tracks.",
      },
      {
        href: "/admin/communities",
        title: "Communities",
        description: "Student tribes, campus groups and industry circles.",
      },
      {
        href: "/admin/events",
        title: "Events",
        description: "Festival and external events, locations and sources.",
      },
      {
        href: "/admin/agenda",
        title: "Agenda",
        description: "Sessions, speakers and event programmes.",
      },
      {
        href: "/admin/news",
        title: "News",
        description: "AI news posts and dispatches.",
      },
      {
        href: "/admin/competitions",
        title: "Competitions",
        description: "Hack Wars, contests, rounds and registration status.",
      },
    ],
  },
  {
    group: "Inbox",
    cards: [
      {
        href: "/admin/applications",
        title: "Applications",
        description: "Speaker applications — review, accept, promote.",
      },
      {
        href: "/admin/hack-wars",
        title: "Hack Wars",
        description: "Competition entries for AI Hack Wars.",
      },
      {
        href: "/admin/messages",
        title: "Messages",
        description: "Contact-form inquiries, reviews and internal notes.",
      },
      {
        href: "/admin/discoveries",
        title: "Discoveries",
        description: "AI-discovered external events awaiting review.",
      },
    ],
  },
];

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Administration
        </p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
          Control <span className="text-volt">room.</span>
        </h1>
        <div className="mt-10 border border-white/10 bg-panel p-8">
          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                Signed in as
              </dt>
              <dd className="mt-1 font-semibold">{admin?.name}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                Email
              </dt>
              <dd className="mt-1 font-semibold">{admin?.email}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                Role
              </dt>
              <dd className="mt-1 font-mono text-sm font-bold text-volt">
                {admin?.role}
              </dd>
            </div>
          </dl>
        </div>

        {SECTIONS.map((group) => (
          <div key={group.group} className="mt-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {group.group}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group border border-white/10 bg-panel p-6 transition-colors hover:border-volt"
                >
                  <h2 className="font-display text-2xl uppercase group-hover:text-volt">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
