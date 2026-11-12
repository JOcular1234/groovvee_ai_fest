import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";

import { NewsPostRowActions } from "@/components/admin/NewsPostRowActions";
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
import { listNewsPostsForAdmin } from "@/lib/news";

export const metadata: Metadata = {
  title: "News · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const { posts, total, page: current, pages } = await withDbRetry(() =>
    listNewsPostsForAdmin(db, { q: query || undefined, page: Number(page) || 1 })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/news${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="News"
        action={{ href: "/admin/news/new", label: "Add post" }}
      />

      <AdminSearchBar
        action="/admin/news"
        placeholder="Search title, excerpt or author…"
        query={query}
      />

      {posts.length === 0 ? (
        <AdminEmptyState>
          {query
            ? `No posts match “${query}”.`
            : "No posts yet. Add your first post to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-190"
          headers={[
            { label: "Post" },
            { label: "Author" },
            { label: "Published" },
            { label: "Status" },
            { label: "Actions", align: "right" },
          ]}
        >
          {posts.map((p) => (
            <tr key={p.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden border border-white/10 bg-ink">
                    {p.coverImageUrl ? (
                      <Image
                        src={p.coverImageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-xs text-volt">
                        {p.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{p.title}</div>
                    <div className="font-mono text-xs text-muted">
                      /news/{p.slug}
                    </div>
                  </div>
                </div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {p.authorName ?? "—"}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {p.publishedAt
                  ? p.publishedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={p.published ? "volt" : "muted"}>
                  {p.published ? "Published" : "Draft"}
                </StatusBadge>
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/news/${p.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <NewsPostRowActions
                    id={p.id}
                    title={p.title}
                    published={p.published}
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
        unit="posts"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
