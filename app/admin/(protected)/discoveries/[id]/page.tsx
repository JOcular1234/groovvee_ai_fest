import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscoveryReviewForm } from "@/components/admin/DiscoveryReviewForm";
import { db, withDbRetry } from "@/lib/db";
import { getCandidate } from "@/lib/discovery/service";
import { listLocationsForSelect } from "@/lib/locations";
import { formatEventDateTime, utcToZonedLocalInput } from "@/lib/datetime";
import { locationLabel } from "@/lib/locations";
import {
  markDuplicateAction,
  rejectCandidateAction,
} from "@/app/admin/(protected)/discoveries/actions";

export const metadata: Metadata = { title: "Review candidate" };
export const instant = false;

const mono = "font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";
const panel = "border border-white/10 bg-panel p-5";

function SourceLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block truncate text-sm text-volt underline-offset-4 hover:underline"
    >
      {label}: {href}
    </a>
  );
}

export default async function CandidateReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [candidate, locations] = await withDbRetry(() =>
    Promise.all([getCandidate(db, id), listLocationsForSelect(db)])
  );
  if (!candidate) notFound();

  const tz = candidate.timezone ?? "UTC";
  const isPending = candidate.status === "PENDING";

  return (
    <section className="px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/discoveries"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted hover:text-volt"
        >
          ← Back to discoveries
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl uppercase sm:text-4xl">
            {candidate.title}
          </h1>
          <span
            className={`border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${
              candidate.status === "PENDING"
                ? "border-volt/60 text-volt"
                : candidate.status === "APPROVED"
                  ? "border-emerald-400/60 text-emerald-400"
                  : "border-white/30 text-muted"
            }`}
          >
            {candidate.status}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Extracted data */}
          <div className="space-y-5">
            <div className={panel}>
              <p className={mono}>Extracted</p>
              <p className="mt-3 text-sm text-white">
                {candidate.startsAt
                  ? formatEventDateTime(candidate.startsAt, tz)
                  : "Date unknown"}
                {candidate.timezone ? ` (${candidate.timezone})` : " · timezone unknown"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {[
                  candidate.venueName,
                  candidate.location
                    ? locationLabel(candidate.location)
                    : [candidate.city, candidate.stateProvince, candidate.country]
                        .filter(Boolean)
                        .join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Location unknown"}
                {candidate.location ? "" : " · unresolved"}
              </p>
              {candidate.category && (
                <p className="mt-1 text-sm text-muted">
                  Category: {candidate.category}
                </p>
              )}
              {candidate.confidence && (
                <p className="mt-1 text-sm text-muted">
                  Confidence: {candidate.confidence}
                </p>
              )}
              {candidate.missingFields.length > 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  Missing / unconfirmed: {candidate.missingFields.join(", ")}
                </p>
              )}
            </div>

            <div className={panel}>
              <p className={mono}>Sources</p>
              <div className="mt-3 space-y-2">
                <SourceLink href={candidate.sourceUrl} label="Source" />
                <SourceLink href={candidate.registrationUrl} label="Registration" />
                <SourceLink href={candidate.imageUrl} label="Image" />
              </div>
              {candidate.evidence && (
                <p className="mt-3 border-t border-white/10 pt-3 text-xs italic text-muted">
                  “{candidate.evidence}”
                </p>
              )}
            </div>

            {(candidate.possible.events.length > 0 ||
              candidate.possible.candidates.length > 0 ||
              candidate.duplicateOfEvent ||
              candidate.duplicateOfCandidate) && (
              <div className={panel}>
                <p className={mono}>Possible duplicates — human decision required</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {candidate.duplicateOfEvent && (
                    <li className="text-amber-400">
                      {candidate.duplicateKind} match → existing event:{" "}
                      <Link
                        href={`/events/${candidate.duplicateOfEvent.slug}`}
                        className="text-volt hover:underline"
                      >
                        {candidate.duplicateOfEvent.title}
                      </Link>
                    </li>
                  )}
                  {candidate.possible.events
                    .filter((e) => e.id !== candidate.duplicateOfEvent?.id)
                    .map((e) => (
                      <li key={e.id} className="text-muted">
                        Event:{" "}
                        <Link href={`/events/${e.slug}`} className="text-volt hover:underline">
                          {e.title}
                        </Link>
                      </li>
                    ))}
                  {candidate.possible.candidates
                    .filter((c) => c.id !== candidate.duplicateOfCandidate?.id)
                    .map((c) => (
                      <li key={c.id} className="text-muted">
                        Candidate:{" "}
                        <Link
                          href={`/admin/discoveries/${c.id}`}
                          className="text-volt hover:underline"
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {!isPending && (
              <div className={panel}>
                <p className={mono}>Review outcome</p>
                <p className="mt-3 text-sm text-white">
                  {candidate.status} by {candidate.reviewer?.name ?? "—"}
                  {candidate.reviewedAt &&
                    ` · ${candidate.reviewedAt.toISOString().slice(0, 16).replace("T", " ")}`}
                </p>
                {candidate.reviewNotes && (
                  <p className="mt-2 text-sm text-muted">{candidate.reviewNotes}</p>
                )}
                {candidate.approvedEvent && (
                  <p className="mt-2 text-sm">
                    Published as:{" "}
                    <Link
                      href={`/events/${candidate.approvedEvent.slug}`}
                      className="text-volt hover:underline"
                    >
                      /events/{candidate.approvedEvent.slug}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Provenance */}
          <div className={panel}>
            <p className={mono}>Discovery</p>
            <dl className="mt-3 space-y-2 text-xs text-muted">
              <div>Run: {candidate.run.provider} · {candidate.run.model}</div>
              <div>Started: {candidate.run.startedAt.toISOString().slice(0, 16).replace("T", " ")}</div>
              <div>Connector: {candidate.connector}</div>
              {candidate.externalId && <div>External ID: {candidate.externalId}</div>}
              {candidate.duplicateKind && <div>Duplicate flag: {candidate.duplicateKind}</div>}
            </dl>
          </div>
        </div>

        {isPending && (
          <>
            <h2 className="mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Review &amp; approve
            </h2>
            <p className="mt-2 text-xs text-muted">
              Edit anything that looks wrong before approving — the AI&apos;s
              extraction is a draft, not truth.
            </p>
            <div className="mt-3">
              <DiscoveryReviewForm
                candidateId={candidate.id}
                locations={locations}
                missingFields={candidate.missingFields}
                initial={{
                  title: candidate.title,
                  description: candidate.description,
                  startsAt: candidate.startsAt
                    ? utcToZonedLocalInput(candidate.startsAt, tz)
                    : "",
                  endsAt: candidate.endsAt
                    ? utcToZonedLocalInput(candidate.endsAt, tz)
                    : "",
                  timezone: tz,
                  city: candidate.city ?? "",
                  stateProvince: candidate.stateProvince ?? "",
                  country: candidate.country ?? "",
                  region: candidate.location?.region ?? "",
                  venueName: candidate.venueName ?? "",
                  isOnline: false,
                  url: candidate.registrationUrl ?? "",
                  imageUrl: candidate.imageUrl ?? "",
                  externalId: candidate.externalId ?? "",
                  locationId: candidate.locationId ?? "",
                }}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <form action={rejectCandidateAction.bind(null, candidate.id)} className={panel}>
                <p className={mono}>Reject</p>
                <textarea
                  name="reviewNotes"
                  rows={2}
                  placeholder="Reason (optional)…"
                  className="mt-3 w-full border border-white/15 bg-ink px-3 py-2 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
                />
                <button
                  type="submit"
                  className="mt-3 border border-red-400/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-red-400 hover:border-red-400"
                >
                  Reject candidate
                </button>
              </form>

              <form action={markDuplicateAction.bind(null, candidate.id)} className={panel}>
                <p className={mono}>Mark as duplicate</p>
                <select
                  name="duplicateOfEventId"
                  className="mt-3 w-full border border-white/15 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-volt"
                >
                  <option value="">— duplicate of another candidate / unspecified —</option>
                  {candidate.possible.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
                <textarea
                  name="reviewNotes"
                  rows={1}
                  placeholder="Notes (optional)…"
                  className="mt-2 w-full border border-white/15 bg-ink px-3 py-2 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
                />
                <button
                  type="submit"
                  className="mt-3 border border-white/25 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-volt hover:text-volt"
                >
                  Mark duplicate
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
