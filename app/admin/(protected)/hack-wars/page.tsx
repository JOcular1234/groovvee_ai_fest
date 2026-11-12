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

const statusTone: Record<string, BadgeTone> = {
  PENDING: "volt",
  REVIEWED: "neutral",
  ACCEPTED: "success",
  REJECTED: "danger",
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
    <AdminPageShell>
      <AdminPageHeader eyebrow="AI Hack Wars" title="Entries" />

      <AdminSearchBar
        action="/admin/hack-wars"
        placeholder="Search name, email, team or school…"
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
        <select
          name="participation"
          defaultValue={participation ?? ""}
          className={adminSelectClass}
        >
          <option value="">All entries</option>
          <option value="individual">Individual</option>
          <option value="team">Team</option>
        </select>
      </AdminSearchBar>

      {applications.length === 0 ? (
        <AdminEmptyState>
          {query || status || participation
            ? "No entries match these filters."
            : "No Hack Wars applications have been submitted yet."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          headers={[
            { label: "Applicant" },
            { label: "Entry" },
            { label: "School" },
            { label: "Status" },
            { label: "Received" },
            { label: "Review", align: "right" },
          ]}
        >
          {applications.map((a) => (
            <tr key={a.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="font-semibold text-white">{a.contactName}</div>
                <div className="font-mono text-xs text-muted">{a.email}</div>
              </td>
              <td className={adminTdClass}>
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
              <td
                className={`${adminTdClass} max-w-48 truncate text-xs text-muted`}
              >
                {a.school}
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
                  href={`/admin/hack-wars/${a.id}`}
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
        unit="entries"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
