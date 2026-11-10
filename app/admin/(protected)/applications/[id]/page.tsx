import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationReviewPanel } from "@/components/admin/ApplicationReviewPanel";
import { db, withDbRetry } from "@/lib/db";
import { getApplicationById } from "@/lib/applications";
import { APPLICATION_STATUS_LABELS } from "@/lib/validation/application";

export const metadata: Metadata = {
  title: "Application · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const field =
  "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted";

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await withDbRetry(() => getApplicationById(db, id));
  if (!app) notFound();

  const links = Array.isArray(app.links)
    ? (app.links as { label?: unknown; url?: unknown }[]).filter(
        (l) => typeof l?.url === "string"
      )
    : [];

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All applications
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Application · {APPLICATION_STATUS_LABELS[app.status]}
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-5xl">
              {app.name}
            </h1>
          </div>
          <p className="font-mono text-xs text-muted">
            Received{" "}
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            }).format(app.createdAt)}{" "}
            UTC
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="border border-white/10 bg-panel p-6">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className={field}>Email</dt>
                  <dd className="mt-1.5 text-sm text-white">{app.email}</dd>
                </div>
                <div>
                  <dt className={field}>Organization</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {app.organization || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={field}>Proposed talk</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {app.talkTitle || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={field}>Bio</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {app.bio}
                  </dd>
                </div>
              </dl>
            </div>

            {links.length > 0 && (
              <div className="border border-white/10 bg-panel p-6">
                <p className={field}>Submitted links</p>
                <ul className="mt-3 space-y-2">
                  {links.map((l, i) => (
                    <li key={i}>
                      <a
                        href={String(l.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-volt hover:underline"
                      >
                        {typeof l.label === "string" && l.label
                          ? `${l.label} — ${l.url}`
                          : String(l.url)}
                      </a>
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
                  on{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  }).format(app.reviewedAt)}{" "}
                  UTC.
                </p>
              </div>
            )}
          </div>

          <ApplicationReviewPanel
            id={app.id}
            status={app.status}
            speakerId={app.speakerId}
            initialNotes={app.reviewNotes ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
