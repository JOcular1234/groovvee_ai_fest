import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";

import { TopicRowActions } from "@/components/admin/TopicRowActions";
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
import { listTopicsForAdmin } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Topics · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const { topics, total, page: current, pages } = await withDbRetry(() =>
    listTopicsForAdmin(db, { q: query || undefined, page: Number(page) || 1 })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/topics${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Topics"
        action={{ href: "/admin/topics/new", label: "Add topic" }}
      />

      <AdminSearchBar
        action="/admin/topics"
        placeholder="Search by title…"
        query={query}
      />

      {topics.length === 0 ? (
        <AdminEmptyState>
          {query
            ? `No topics match “${query}”.`
            : "No topics yet. Add your first topic to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-190"
          headers={[
            { label: "Topic" },
            { label: "Slug" },
            { label: "Status" },
            { label: "Order" },
            { label: "Created" },
            { label: "Actions", align: "right" },
          ]}
        >
          {topics.map((t, i) => (
            <tr key={t.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden border border-white/10 bg-ink">
                    {t.imageUrl ? (
                      <Image
                        src={t.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-xs text-volt">
                        {t.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-white">{t.title}</span>
                </div>
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {t.slug}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={t.published ? "volt" : "muted"}>
                  {t.published ? "Published" : "Draft"}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} font-mono text-muted`}>
                {t.sortOrder}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {t.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/topics/${t.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <TopicRowActions
                    id={t.id}
                    title={t.title}
                    published={t.published}
                    isFirst={i === 0 && current === 1}
                    isLast={i === topics.length - 1 && current === pages}
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
        unit="topics"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
