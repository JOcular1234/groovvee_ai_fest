import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CommunityRowActions } from "@/components/admin/CommunityRowActions";
import { db, withDbRetry } from "@/lib/db";
import { listCommunitiesForAdmin } from "@/lib/communities";
import { COMMUNITY_TYPE_LABELS } from "@/lib/validation/community";

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
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Content
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
              Communities<span className="text-volt">.</span>
            </h1>
          </div>
          <Link
            href="/admin/communities/new"
            className="inline-flex items-center gap-2 bg-volt px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            Add community
          </Link>
        </div>

        <form action="/admin/communities" className="mt-10 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search name or city…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
            />
          </div>
          <button
            type="submit"
            className="border border-white/25 px-5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Search
          </button>
        </form>

        {communities.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
            <p className="text-muted">
              {query
                ? `No communities match “${query}”.`
                : "No communities yet. Add your first community to get started."}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
            <table className="w-full min-w-215 text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-3 font-bold">Community</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Location</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-3">
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
                          <div className="font-semibold text-white">
                            {c.name}
                          </div>
                          <div className="font-mono text-xs text-muted">
                            /communities/{c.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {COMMUNITY_TYPE_LABELS[c.type] ?? c.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${
                            c.published
                              ? "bg-volt/15 text-volt"
                              : "bg-white/10 text-muted"
                          }`}
                        >
                          {c.published ? "Published" : "Draft"}
                        </span>
                        {c.featured && (
                          <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {c.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/communities/${c.id}/edit`}
                          className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:text-volt"
                        >
                          Edit
                        </Link>
                        <CommunityRowActions
                          id={c.id}
                          name={c.name}
                          published={c.published}
                          featured={c.featured}
                          isFirst={i === 0 && current === 1}
                          isLast={
                            i === communities.length - 1 && current === pages
                          }
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
              Page {current} of {pages} · {total} communities
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
