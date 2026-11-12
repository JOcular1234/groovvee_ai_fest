import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";

import { CommunityRowActions } from "@/components/admin/CommunityRowActions";
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
import { db, withDbRetry } from "@/lib/db";
import { listCommunitiesForAdmin } from "@/lib/communities";
import {
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_TYPE_LABELS,
} from "@/lib/validation/community";

export const metadata: Metadata = {
  title: "Communities · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminCommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const { communities, total, page: current, pages } = await withDbRetry(() =>
    listCommunitiesForAdmin(db, {
      q: query || undefined,
      page: Number(page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/communities${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Communities"
        action={{ href: "/admin/communities/new", label: "Add community" }}
      />

      <AdminSearchBar
        action="/admin/communities"
        placeholder="Search name or city…"
        query={query}
      />

      {communities.length === 0 ? (
        <AdminEmptyState>
          {query
            ? `No communities match “${query}”.`
            : "No communities yet. Add your first community to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-215"
          headers={[
            { label: "Community" },
            { label: "Type" },
            { label: "Location" },
            { label: "Status" },
            { label: "Order" },
            { label: "Actions", align: "right" },
          ]}
        >
          {communities.map((c, i) => (
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
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="font-mono text-xs text-muted">
                      /communities/{c.slug}
                    </div>
                  </div>
                </div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {COMMUNITY_TYPE_LABELS[c.type] ?? c.type}
                {c.category && (
                  <div className="text-volt">
                    {COMMUNITY_CATEGORY_LABELS[c.category] ?? c.category}
                  </div>
                )}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {[c.city, c.country].filter(Boolean).join(", ") || "—"}
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
                    href={`/admin/communities/${c.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <CommunityRowActions
                    id={c.id}
                    name={c.name}
                    published={c.published}
                    featured={c.featured}
                    isFirst={i === 0 && current === 1}
                    isLast={i === communities.length - 1 && current === pages}
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
        unit="communities"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
