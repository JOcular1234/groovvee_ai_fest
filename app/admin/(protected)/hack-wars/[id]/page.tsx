import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HackWarsReviewPanel } from "@/components/admin/HackWarsReviewPanel";
import { db, withDbRetry } from "@/lib/db";
import { getHackWarsApplicationById } from "@/lib/hack-wars";
import { APPLICATION_STATUS_LABELS } from "@/lib/validation/application";

export const metadata: Metadata = {
  title: "Hack Wars Entry · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const field =
  "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted";

const dateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);

export default async function AdminHackWarsEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const app = await withDbRetry(() => getHackWarsApplicationById(db, id));
  if (!app) notFound();

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/admin/hack-wars"
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All entries
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {app.team ? `Team · ${app.team.name}` : "Individual"} ·{" "}
              {APPLICATION_STATUS_LABELS[app.status]}
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-5xl">
              {app.contactName}
            </h1>
          </div>
          <p className="font-mono text-xs text-muted">
            {app.competition.title} · Received {dateTime(app.createdAt)} UTC
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="border border-white/10 bg-panel p-6">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className={field}>Email</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    <a
                      href={`mailto:${app.email}`}
                      className="text-volt hover:underline"
                    >
                      {app.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className={field}>Phone</dt>
                  <dd className="mt-1.5 text-sm text-white">{app.phone}</dd>
                </div>
                <div>
                  <dt className={field}>School / institution</dt>
                  <dd className="mt-1.5 text-sm text-white">{app.school}</dd>
                </div>
                <div>
                  <dt className={field}>Major</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {app.major || "—"}
                  </dd>
                </div>
                <div>
                  <dt className={field}>Expected graduation</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {app.gradYear ?? "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={field}>Introduction</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {app.intro}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={field}>Previous contests</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {app.previousExperience || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {app.team && (
              <div className="border border-white/10 bg-panel p-6">
                <p className={field}>Team — {app.team.name}</p>
                <ul className="mt-4 space-y-3">
                  {app.team.participants.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm text-white">{p.name}</p>
                        <p className="font-mono text-xs text-muted">
                          {p.email}
                          {p.school ? ` · ${p.school}` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-volt">
                        {p.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {app.reviewedAt && (
              <div className="border border-white/10 bg-panel p-6">
                <p className={field}>Review</p>
                <p className="mt-2 text-sm text-muted">
                  {app.reviewer?.name ?? "An admin"} marked this{" "}
                  <span className="lowercase">
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </span>{" "}
                  on {dateTime(app.reviewedAt)} UTC.
                </p>
              </div>
            )}
          </div>

          <HackWarsReviewPanel
            id={app.id}
            status={app.status}
            initialNotes={app.reviewNotes ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
