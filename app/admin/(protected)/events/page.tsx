import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { EventRowActions } from "@/components/admin/EventRowActions";
import { db, withDbRetry } from "@/lib/db";
import { listEventFilterOptions, listEventsForAdmin } from "@/lib/events";
import { EVENT_SOURCE_LABELS, EVENT_SOURCES } from "@/lib/validation/event";

export const metadata: Metadata = {
  title: "Events · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const selectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

function formatDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    source?: string;
    region?: string;
    country?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : undefined;
  const source =
    sp.source === "GROOVVEE" || sp.source === "EXTERNAL" ? sp.source : undefined;
  const region = sp.region || undefined;
  const country = sp.country || undefined;
  const sort = sp.sort === "recent" ? "recent" : "date";

  const [{ events, total, page: current, pages }, { regions, countries }] =
    await withDbRetry(async () =>
      Promise.all([
        listEventsForAdmin(db, {
          q: query || undefined,
          page: Number(sp.page) || 1,
          status,
          source,
          region,
          country,
          sort,
        }),
        listEventFilterOptions(db),
      ])
    );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (region) params.set("region", region);
    if (country) params.set("country", country);
    if (sort !== "date") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/events${s ? `?${s}` : ""}`;
  };

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Content
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
              Events<span className="text-volt">.</span>
            </h1>
          </div>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-2 bg-volt px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            Add event
          </Link>
        </div>

        <form
          action="/admin/events"
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
              placeholder="Search title or city…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select name="status" defaultValue={status ?? ""} className={selectClass}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select name="source" defaultValue={source ?? ""} className={selectClass}>
            <option value="">All sources</option>
            {EVENT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="region" defaultValue={region ?? ""} className={selectClass}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="country" defaultValue={country ?? ""} className={selectClass}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className={selectClass}>
            <option value="date">By date</option>
            <option value="recent">Recently updated</option>
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
        </form>

        {events.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
            <p className="text-muted">
              {query || status || source || region || country
                ? "No events match these filters."
                : "No events yet. Add your first event to get started."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
            <table className="w-full min-w-235 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-3 font-bold">Event</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Location</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                  <th className="px-4 py-3 font-bold">Community</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Updated</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{e.title}</div>
                      <div className="font-mono text-xs text-muted">
                        /events/{e.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(e.startsAt, e.timezone)}
                      <div className="font-mono text-[10px]">{e.timezone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {e.isOnline
                        ? "Online"
                        : [e.city, e.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {EVENT_SOURCE_LABELS[e.source] ?? e.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {e.community?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${
                            e.published
                              ? "bg-volt/15 text-volt"
                              : "bg-white/10 text-muted"
                          }`}
                        >
                          {e.published ? "Published" : "Draft"}
                        </span>
                        {e.featured && (
                          <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(e.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/events/${e.id}/edit`}
                          className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:text-volt"
                        >
                          Edit
                        </Link>
                        <EventRowActions
                          id={e.id}
                          title={e.title}
                          published={e.published}
                          featured={e.featured}
                          isFirst={i === 0 && current === 1}
                          isLast={i === events.length - 1 && current === pages}
                        />
                      </div>
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
              Page {current} of {pages} · {total} events
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
