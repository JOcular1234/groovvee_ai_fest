import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";

import { CompetitionRowActions } from "@/components/admin/CompetitionRowActions";
import {
  adminLinkClass,
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
import { listCompetitionsForAdmin } from "@/lib/competitions";
import { db, withDbRetry } from "@/lib/db";
import {
  COMPETITION_KIND_LABELS,
  COMPETITION_STATUS_LABELS,
} from "@/lib/validation/competition";

export const metadata: Metadata = {
  title: "Competitions · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const statusTone: Record<string, "volt" | "muted"> = {
  UPCOMING: "muted",
  REGISTRATION_OPEN: "volt",
  RUNNING: "volt",
  COMPLETED: "muted",
};

export default async function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const {
    competitions,
    total,
    page: current,
    pages,
  } = await withDbRetry(() =>
    listCompetitionsForAdmin(db, {
      q: query || undefined,
      page: Number(page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/competitions${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Competitions"
        action={{ href: "/admin/competitions/new", label: "Add competition" }}
      />

      <AdminSearchBar
        action="/admin/competitions"
        placeholder="Search title…"
        query={query}
      />

      {competitions.length === 0 ? (
        <AdminEmptyState>
          {query
            ? `No competitions match “${query}”.`
            : "No competitions yet. Add your first competition to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-215"
          headers={[
            { label: "Competition" },
            { label: "Kind" },
            { label: "Status" },
            { label: "Entries" },
            { label: "Visibility" },
            { label: "Order" },
            { label: "Actions", align: "right" },
          ]}
        >
          {competitions.map((c, i) => (
            <tr key={c.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden border border-white/10 bg-ink">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-xs text-volt">
                        {c.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{c.title}</div>
                    <div className="font-mono text-xs text-muted">
                      /competitions/{c.slug}
                    </div>
                  </div>
                </div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {COMPETITION_KIND_LABELS[c.kind] ?? c.kind}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={statusTone[c.status] ?? "muted"}>
                  {COMPETITION_STATUS_LABELS[c.status] ?? c.status}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} font-mono text-muted`}>
                {c._count.applications}
              </td>
              <td className={adminTdClass}>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge tone={c.published ? "volt" : "muted"}>
                    {c.published ? "Published" : "Draft"}
                  </StatusBadge>
                  {c.featured && (
                    <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                      Featured
                    </span>
                  )}
                </div>
              </td>
              <td className={`${adminTdClass} font-mono text-muted`}>
                {c.sortOrder}
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/competitions/${c.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <CompetitionRowActions
                    id={c.id}
                    name={c.title}
                    published={c.published}
                    featured={c.featured}
                    isFirst={i === 0 && current === 1}
                    isLast={
                      i === competitions.length - 1 && current === pages
                    }
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
        unit="competitions"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
