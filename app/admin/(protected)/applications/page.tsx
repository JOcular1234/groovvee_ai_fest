import type { Metadata } from "next";
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
  listApplicationsForAdmin,
  type AdminApplicationFilters,
} from "@/lib/applications";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from "@/lib/validation/application";

export const metadata: Metadata = {
  title: "Applications · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const statusTone: Record<string, BadgeTone> = {
  PENDING: "volt",
  REVIEWED: "neutral",
  ACCEPTED: "success",
  REJECTED: "danger",
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const status =
    sp.status && APPLICATION_STATUSES.some((s) => s.value === sp.status)
      ? (sp.status as AdminApplicationFilters["status"])
      : undefined;

  const { applications, total, page: current, pages } = await withDbRetry(() =>
    listApplicationsForAdmin(db, {
      q: query || undefined,
      status,
      page: Number(sp.page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/applications${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader eyebrow="Inbox" title="Applications" />

      <AdminSearchBar
        action="/admin/applications"
        placeholder="Search name, email or talk title…"
        query={query}
      >
        <select
          name="status"
          defaultValue={status ?? ""}
          className={adminSelectClass}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </AdminSearchBar>

      {applications.length === 0 ? (
        <AdminEmptyState>
          {query || status
            ? "No applications match these filters."
            : "No speaker applications have been submitted yet."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          headers={[
            { label: "Applicant" },
            { label: "Organization" },
            { label: "Talk title" },
            { label: "Status" },
            { label: "Received" },
            { label: "Review", align: "right" },
          ]}
        >
          {applications.map((a) => (
            <tr key={a.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="font-semibold text-white">{a.name}</div>
                <div className="font-mono text-xs text-muted">{a.email}</div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {a.organization || "—"}
              </td>
              <td
                className={`${adminTdClass} max-w-56 truncate text-xs text-muted`}
              >
                {a.talkTitle || "—"}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={statusTone[a.status]}>
                  {APPLICATION_STATUS_LABELS[a.status]}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(a.createdAt)}
              </td>
              <td className={`${adminTdClass} text-right`}>
                <Link
                  href={`/admin/applications/${a.id}`}
                  className={adminLinkClass}
                >
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
        unit="applications"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
