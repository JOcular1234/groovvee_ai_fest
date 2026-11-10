import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { AgendaRowActions } from "@/components/admin/AgendaRowActions";
import { db, withDbRetry } from "@/lib/db";
import { listAgendaForAdmin, listEventsForAgendaSelect } from "@/lib/agenda";
import { SESSION_TYPE_LABELS, SESSION_TYPES } from "@/lib/validation/agenda";

export const metadata: Metadata = {
  title: "Agenda · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const selectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    event?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const eventFilter = sp.event || undefined;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : undefined;
  const type =
    sp.type && SESSION_TYPES.some((t) => t.value === sp.type)
      ? sp.type
      : undefined;

  const [{ items, total, page: current, pages }, events] = await withDbRetry(
    async () =>
      Promise.all([
        listAgendaForAdmin(db, {
          q: query || undefined,
          page: Number(sp.page) || 1,
          eventId: eventFilter,
          status,
          type,
        }),
        listEventsForAgendaSelect(db),
      ])
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (eventFilter) params.set("event", eventFilter);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/agenda${s ? `?${s}` : ""}`;
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
              Agenda<span className="text-volt">.</span>
            </h1>
          </div>
          <Link
            href="/admin/agenda/new"
            className="inline-flex items-center gap-2 bg-volt px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            Add session
          </Link>
        </div>

        <form
          action="/admin/agenda"
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
              placeholder="Search title or location…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select name="event" defaultValue={eventFilter ?? ""} className={selectClass}>
            <option value="">All events</option>
            <option value="none">Unlinked sessions</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.published ? "" : " (draft)"}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} className={selectClass}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select name="type" defaultValue={type ?? ""} className={selectClass}>
            <option value="">All types</option>
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
        </form>

        {items.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
            <p className="text-muted">
              {query || eventFilter || status || type
                ? "No sessions match these filters."
                : "No agenda items yet. Add your first session to get started."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
            <table className="w-full min-w-220 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-3 font-bold">Session</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Time (UTC)</th>
                  <th className="px-4 py-3 font-bold">Event</th>
                  <th className="px-4 py-3 font-bold">Speakers</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a, i) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{a.title}</div>
                      {a.location && (
                        <div className="font-mono text-xs text-muted">
                          {a.location}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {SESSION_TYPE_LABELS[a.type] ?? a.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      }).format(a.startsAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {a.event ? a.event.title : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {a._count.speakers || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${
                          a.published
                            ? "bg-volt/15 text-volt"
                            : "bg-white/10 text-muted"
                        }`}
                      >
                        {a.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {a.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/agenda/${a.id}/edit`}
                          className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:text-volt"
                        >
                          Edit
                        </Link>
                        <AgendaRowActions
                          id={a.id}
                          title={a.title}
                          published={a.published}
                          isFirst={i === 0 && current === 1}
                          isLast={i === items.length - 1 && current === pages}
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
              Page {current} of {pages} · {total} sessions
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
