import type { Metadata } from "next";
import Link from "next/link";

import { AgendaRowActions } from "@/components/admin/AgendaRowActions";
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
} from "@/components/admin/ui";
import { db, withDbRetry } from "@/lib/db";
import { listAgendaForAdmin, listEventsForAgendaSelect } from "@/lib/agenda";
import { SESSION_TYPE_LABELS, SESSION_TYPES } from "@/lib/validation/agenda";

export const metadata: Metadata = {
  title: "Agenda · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

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
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Agenda"
        action={{ href: "/admin/agenda/new", label: "Add session" }}
      />

      <AdminSearchBar
        action="/admin/agenda"
        placeholder="Search title or location…"
        query={query}
      >
        <select
          name="event"
          defaultValue={eventFilter ?? ""}
          className={adminSelectClass}
        >
          <option value="">All events</option>
          <option value="none">Unlinked sessions</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
              {e.published ? "" : " (draft)"}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className={adminSelectClass}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className={adminSelectClass}
        >
          <option value="">All types</option>
          {SESSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </AdminSearchBar>

      {items.length === 0 ? (
        <AdminEmptyState>
          {query || eventFilter || status || type
            ? "No sessions match these filters."
            : "No agenda items yet. Add your first session to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-220"
          headers={[
            { label: "Session" },
            { label: "Type" },
            { label: "Time (UTC)" },
            { label: "Event" },
            { label: "Speakers" },
            { label: "Status" },
            { label: "Order" },
            { label: "Actions", align: "right" },
          ]}
        >
          {items.map((a, i) => (
            <tr key={a.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="font-semibold text-white">{a.title}</div>
                {a.location && (
                  <div className="font-mono text-xs text-muted">
                    {a.location}
                  </div>
                )}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {SESSION_TYPE_LABELS[a.type] ?? a.type}
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                }).format(a.startsAt)}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {a.event ? a.event.title : "—"}
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {a._count.speakers || "—"}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={a.published ? "volt" : "muted"}>
                  {a.published ? "Published" : "Draft"}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} font-mono text-muted`}>
                {a.sortOrder}
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/agenda/${a.id}/edit`}
                    className={adminLinkClass}
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
        </AdminTable>
      )}

      <AdminPagination
        page={current}
        pages={pages}
        total={total}
        unit="sessions"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
