import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import {
  adminLinkClass,
  adminSelectClass,
  adminTdClass,
  adminTrClass,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminPagination,
  AdminSearchBar,
  AdminTable,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin/ui";
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

const statusTone: Record<string, BadgeTone> = {
  NEW: "volt",
  READ: "neutral",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  ARCHIVED: "ghost",
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
    <AdminPageShell>
      <AdminPageHeader eyebrow="Inbox" title="Messages" />

      <AdminSearchBar
        action="/admin/messages"
        placeholder="Search name, email, subject or message…"
        query={query}
      >
        <select
          name="type"
          defaultValue={type ?? ""}
          className={adminSelectClass}
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
          className={adminSelectClass}
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
          className={adminSelectClass}
        >
          <option value="">All messages</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </AdminSearchBar>

      {messages.length === 0 ? (
        <AdminEmptyState>
          {query || type || status || read
            ? "No messages match these filters."
            : "No messages have been received yet."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          headers={[
            { label: "Sender" },
            { label: "Category" },
            { label: "Subject" },
            { label: "Status" },
            { label: "Received" },
            { label: "Open", align: "right" },
          ]}
        >
          {messages.map((m) => (
            <tr key={m.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="flex items-center gap-2 font-semibold text-white">
                  {!m.readAt && (
                    <span
                      className="inline-block size-2 bg-volt"
                      aria-label="Unread"
                    />
                  )}
                  {m.name}
                </div>
                <div className="font-mono text-xs text-muted">{m.email}</div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {INQUIRY_TYPES.find((t) => t.value === m.type)?.label ?? m.type}
              </td>
              <td
                className={`${adminTdClass} max-w-56 truncate text-xs text-muted`}
              >
                {m.subject || "—"}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={statusTone[m.status]}>
                  {MESSAGE_STATUS_LABELS[m.status]}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(m.createdAt)}
              </td>
              <td className={`${adminTdClass} text-right`}>
                <Link href={`/admin/messages/${m.id}`} className={adminLinkClass}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination
        page={current}
        pages={pages}
        total={total}
        unit="messages"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
