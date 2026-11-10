import type { Metadata } from "next";
import { connection } from "next/server";
import { Search } from "lucide-react";
import Link from "next/link";

import { db, withDbRetry } from "@/lib/db";
import {
  listMessagesForAdmin,
  type AdminMessageFilters,
} from "@/lib/messages";
import { INQUIRY_TYPES } from "@/lib/inquiry-types";
import {
  MESSAGE_STATUS_LABELS,
  MESSAGE_STATUSES,
} from "@/lib/message-status";
import { messageStatusSchema } from "@/lib/validation/message";

export const metadata: Metadata = {
  title: "Messages · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const statusBadge: Record<string, string> = {
  NEW: "bg-volt/15 text-volt",
  READ: "bg-white/10 text-white/70",
  IN_PROGRESS: "bg-sky-400/15 text-sky-300",
  RESOLVED: "bg-emerald-400/15 text-emerald-300",
  ARCHIVED: "bg-white/5 text-muted",
};

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    type?: string;
    status?: string;
    read?: string;
  }>;
}) {
  await connection();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const type = INQUIRY_TYPES.some((t) => t.value === sp.type)
    ? sp.type
    : undefined;
  const status = messageStatusSchema.safeParse(sp.status).success
    ? (sp.status as AdminMessageFilters["status"])
    : undefined;
  const read =
    sp.read === "unread" || sp.read === "read" ? sp.read : undefined;

  const { messages, total, page: current, pages } = await withDbRetry(() =>
    listMessagesForAdmin(db, {
      q: query || undefined,
      type,
      status,
      read,
      page: Number(sp.page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (read) params.set("read", read);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/messages${s ? `?${s}` : ""}`;
  };

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Inbox
        </p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
          Messages<span className="text-volt">.</span>
        </h1>

        <form
          action="/admin/messages"
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
              placeholder="Search name, email, subject or message…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt"
          >
            <option value="">All categories</option>
            {INQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt"
          >
            <option value="">All statuses</option>
            {MESSAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            name="read"
            defaultValue={read ?? ""}
            className="border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt"
          >
            <option value="">All messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <button
            type="submit"
            className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Filter
          </button>
        </form>

        {messages.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
            <p className="text-muted">
              {query || type || status || read
                ? "No messages match these filters."
                : "No messages have been received yet."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
            <table className="w-full min-w-200 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-3 font-bold">Sender</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Subject</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Received</th>
                  <th className="px-4 py-3 text-right font-bold">Open</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        {!m.readAt && (
                          <span
                            className="inline-block size-2 bg-volt"
                            aria-label="Unread"
                          />
                        )}
                        {m.name}
                      </div>
                      <div className="font-mono text-xs text-muted">
                        {m.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {INQUIRY_TYPES.find((t) => t.value === m.type)?.label ??
                        m.type}
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-xs text-muted">
                      {m.subject || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${statusBadge[m.status]}`}
                      >
                        {MESSAGE_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(m.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/messages/${m.id}`}
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
              Page {current} of {pages} · {total} messages
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
