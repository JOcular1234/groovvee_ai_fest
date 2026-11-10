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

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/speakers"
            className="group border border-white/10 bg-panel p-6 transition-colors hover:border-volt"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Content
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase group-hover:text-volt">
              Speakers
            </h2>
            <p className="mt-2 text-sm text-muted">
              Create, publish and order the speaker lineup.
            </p>
          </Link>
          <Link
            href="/admin/topics"
            className="group border border-white/10 bg-panel p-6 transition-colors hover:border-volt"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Content
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase group-hover:text-volt">
              Topics
            </h2>
            <p className="mt-2 text-sm text-muted">
              Curate the festival&apos;s subject tracks.
            </p>
          </Link>
          <Link
            href="/admin/communities"
            className="group border border-white/10 bg-panel p-6 transition-colors hover:border-volt"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Content
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase group-hover:text-volt">
              Communities
            </h2>
            <p className="mt-2 text-sm text-muted">
              Student tribes, campus groups and industry circles.
            </p>
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted">
          Events, competitions, news and inbox management arrive in later
          stages.
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
