import type { Metadata } from "next";
import { connection } from "next/server";
import { Search } from "lucide-react";
import Link from "next/link";

import { db, withDbRetry } from "@/lib/db";
import {
  listHackWarsApplicationsForAdmin,
  type AdminHackWarsFilters,
} from "@/lib/hack-wars";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from "@/lib/validation/application";

export const metadata: Metadata = {
  title: "Hack Wars · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const statusBadge: Record<string, string> = {
  PENDING: "bg-volt/15 text-volt",
  REVIEWED: "bg-white/10 text-white/70",
  ACCEPTED: "bg-emerald-400/15 text-emerald-300",
  REJECTED: "bg-red-400/15 text-red-300",
};

export default async function AdminHackWarsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    participation?: string;
  }>;
}) {
  await connection();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const status =
    sp.status && APPLICATION_STATUSES.some((s) => s.value === sp.status)
      ? (sp.status as AdminHackWarsFilters["status"])
      : undefined;
  const participation =
    sp.participation === "team" || sp.participation === "individual"
      ? sp.participation
      : undefined;

  const {
    applications,
    total,
    page: current,
    pages,
  } = await withDbRetry(() =>
    listHackWarsApplicationsForAdmin(db, {
      q: query || undefined,
      status,
      participation,
      page: Number(sp.page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (participation) params.set("participation", participation);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/hack-wars${s ? `?${s}` : ""}`;
  };

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          AI Hack Wars
        </p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
          Entries<span className="text-volt">.</span>
        </h1>

        <form
          action="/admin/hack-wars"
          className="mt-10 flex flex-wrap items-end gap-2"
        >
          <div className="relative min-w-55 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search name, email, team or school…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt"
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            name="participation"
            defaultValue={participation ?? ""}
            className="border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt"
          >
            <option value="">All entries</option>
            <option value="individual">Individual</option>
            <option value="team">Team</option>
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
        </form>

        {applications.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
            <p className="text-muted">
              {query || status || participation
                ? "No entries match these filters."
                : "No Hack Wars applications have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
            <table className="w-full min-w-200 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-3 font-bold">Applicant</th>
                  <th className="px-4 py-3 font-bold">Entry</th>
                  <th className="px-4 py-3 font-bold">School</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Received</th>
                  <th className="px-4 py-3 text-right font-bold">Review</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {a.contactName}
                      </div>
                      <div className="font-mono text-xs text-muted">
                        {a.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.team ? (
                        <div>
                          <span className="text-xs text-white">{a.team.name}</span>
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-volt">
                            Team
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                          Individual
                        </span>
                      )}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-xs text-muted">
                      {a.school}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${statusBadge[a.status]}`}
                      >
                        {APPLICATION_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(a.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/hack-wars/${a.id}`}
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:text-volt"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
            <Link
              href={pageHref(current - 1)}
              aria-disabled={current <= 1}
              className={`border px-4 py-2 ${
                current <= 1
                  ? "pointer-events-none border-white/10 text-muted/40"
                  : "border-white/25 text-white hover:border-volt hover:text-volt"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-muted">
              Page {current} of {pages} · {total} entries
            </span>
            <Link
              href={pageHref(current + 1)}
              aria-disabled={current >= pages}
              className={`border px-4 py-2 ${
                current >= pages
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
