import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { DiscoveryRunForm } from "@/components/admin/DiscoveryRunForm";
import { db, withDbRetry } from "@/lib/db";
import {
  discoveryFormOptions,
  discoveryStats,
  listCandidates,
  listDiscoveryRuns,
} from "@/lib/discovery/service";

export const metadata: Metadata = { title: "Event Discovery" };
export const instant = false;

const STATUS_TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DUPLICATE", label: "Duplicates" },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "border-volt/60 text-volt",
    APPROVED: "border-emerald-400/60 text-emerald-400",
    REJECTED: "border-red-400/60 text-red-400",
    DUPLICATE: "border-white/30 text-muted",
  };
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${styles[status] ?? styles.PENDING}`}
    >
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-panel p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white">{value}</p>
    </div>
  );
}

export default async function DiscoveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status ?? "PENDING";

  const [stats, runs, result, options] = await withDbRetry(() =>
    Promise.all([
      discoveryStats(db),
      listDiscoveryRuns(db),
      listCandidates(db, { q: q || undefined, status, page }),
      discoveryFormOptions(db),
    ])
  );

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      status,
      page: undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/discoveries${s ? `?${s}` : ""}`;
  };

  return (
    <section className="px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          Event discovery<span className="text-volt">.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          AI-assisted discovery of external AI events. Every candidate is
          reviewed by an administrator before it can appear publicly.
        </p>

        {/* Overview */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Discovered" value={stats.total} />
          <Stat label="Pending review" value={stats.pending} />
          <Stat label="Approved" value={stats.approved} />
          <Stat label="Rejected" value={stats.rejected} />
          <Stat label="Duplicates" value={stats.duplicates} />
        </div>

        {/* Run discovery */}
        <h2 className="mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Run discovery
        </h2>
        <div className="mt-3">
          <DiscoveryRunForm
            regions={options.regions}
            countries={options.countries}
            cities={options.cities}
            dateFrom={new Date().toISOString().slice(0, 10)}
            // Request-time page (await connection() above); this is only a
            // form default, not rendered state.
            // eslint-disable-next-line react-hooks/purity
            dateTo={new Date(Date.now() + 60 * 86_400_000)
              .toISOString()
              .slice(0, 10)}
          />
        </div>

        {/* Recent runs */}
        <h2 className="mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Recent runs
        </h2>
        {runs.length === 0 ? (
          <p className="mt-3 border border-white/10 bg-panel p-6 text-sm text-muted">
            No discovery runs yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-white/10">
            <table className="w-full min-w-175 text-left text-sm">
              <thead className="border-b border-white/10 bg-panel font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">By</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Found</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3">Dupes</th>
                  <th className="px-4 py-3">Invalid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {runs.map((r) => (
                  <tr key={r.id} className="bg-panel/60">
                    <td className="px-4 py-3 text-muted">
                      {r.startedAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3">{r.admin.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {r.provider}/{r.model}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.error && (
                        <p className="mt-1 max-w-55 truncate text-xs text-red-400" title={r.error}>
                          {r.error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.eventsFound}</td>
                    <td className="px-4 py-3">{r._count.candidates}</td>
                    <td className="px-4 py-3">{r.duplicatesFound}</td>
                    <td className="px-4 py-3">{r.invalidCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Candidates */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            Candidates
          </h2>
          <form action="/admin/discoveries" className="flex gap-2">
            <input type="hidden" name="status" value={status} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search candidates…"
              className="border border-white/15 bg-ink px-3 py-2 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
            <button
              type="submit"
              className="border border-white/25 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-volt hover:text-volt"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-3 flex gap-4 border-b border-white/10 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.value}
              href={href({ status: t.value, page: undefined })}
              className={`pb-2.5 transition-colors ${
                result.status === t.value
                  ? "border-b-2 border-volt text-volt"
                  : "text-muted hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {result.candidates.length === 0 ? (
          <p className="mt-6 border border-white/10 bg-panel p-8 text-center text-sm text-muted">
            No {result.status.toLowerCase()} candidates{q ? ` matching "${q}"` : ""}.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-white/10">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-white/10 bg-panel font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {result.candidates.map((c) => (
                  <tr key={c.id} className="bg-panel/60">
                    <td className="max-w-65 px-4 py-3">
                      <Link
                        href={`/admin/discoveries/${c.id}`}
                        className="font-semibold text-white hover:text-volt"
                      >
                        {c.title}
                      </Link>
                      {(c.duplicateOfEvent || c.duplicateKind) && (
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-400">
                          {c.duplicateKind === "EXACT" ? "exact" : "possible"} duplicate
                          {c.duplicateOfEvent ? ` of “${c.duplicateOfEvent.title}”` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.startsAt
                        ? c.startsAt.toISOString().slice(0, 10)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.location
                        ? c.location.type === "COUNTRY_FALLBACK"
                          ? `${c.location.country} (countrywide)`
                          : [c.location.name, c.location.country].filter(Boolean).join(", ")
                        : [c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.category ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.confidence ?? "—"}
                      {c.missingFields.length > 0 && (
                        <p className="text-[10px] text-amber-400">
                          missing: {c.missingFields.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.pages > 1 && (
          <div className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
            <Link
              href={href({ page: String(result.page - 1) })}
              aria-disabled={result.page <= 1}
              className={`border px-4 py-2 ${
                result.page <= 1
                  ? "pointer-events-none border-white/10 text-muted/40"
                  : "border-white/25 text-white hover:border-volt hover:text-volt"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-muted">
              Page {result.page} of {result.pages} · {result.total} candidates
            </span>
            <Link
              href={href({ page: String(result.page + 1) })}
              aria-disabled={result.page >= result.pages}
              className={`border px-4 py-2 ${
                result.page >= result.pages
                  ? "pointer-events-none border-white/10 text-muted/40"
                  : "border-white/25 text-white hover:border-volt hover:text-volt"
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
