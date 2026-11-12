import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";

import { SpeakerRowActions } from "@/components/admin/SpeakerRowActions";
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
import { listSpeakersForAdmin } from "@/lib/speakers";

export const metadata: Metadata = {
  title: "Speakers · Admin",
  robots: { index: false, follow: false },
};

// Reads cookies() via the protected layout and live DB data — per-request.
export const instant = false;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

export default async function AdminSpeakersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const { speakers, total, page: current, pages } = await withDbRetry(() =>
    listSpeakersForAdmin(db, {
      q: query || undefined,
      page: Number(page) || 1,
    })
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/speakers${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Speakers"
        action={{ href: "/admin/speakers/new", label: "Add speaker" }}
      />

      <AdminSearchBar
        action="/admin/speakers"
        placeholder="Search name or organization…"
        query={query}
      />

      {speakers.length === 0 ? (
        <AdminEmptyState>
          {query
            ? `No speakers match “${query}”.`
            : "No speakers yet. Add your first speaker to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-215"
          headers={[
            { label: "Speaker" },
            { label: "Title / Org" },
            { label: "Status" },
            { label: "Order" },
            { label: "Created" },
            { label: "Actions", align: "right" },
          ]}
        >
          {speakers.map((s, i) => (
            <tr key={s.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden border border-white/10 bg-ink">
                    {s.imageUrl ? (
                      <Image
                        src={s.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-xs text-volt">
                        {initials(s.name)}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-white">{s.name}</span>
                </div>
              </td>
              <td className={`${adminTdClass} text-muted`}>
                <div>{s.title || "—"}</div>
                <div className="text-xs">{s.organization}</div>
              </td>
              <td className={adminTdClass}>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge tone={s.published ? "volt" : "muted"}>
                    {s.published ? "Published" : "Draft"}
                  </StatusBadge>
                  {s.featured && (
                    <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                      Featured
                    </span>
                  )}
                </div>
              </td>
              <td className={`${adminTdClass} font-mono text-muted`}>
                {s.sortOrder}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {s.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/speakers/${s.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <SpeakerRowActions
                    id={s.id}
                    name={s.name}
                    published={s.published}
                    featured={s.featured}
                    isFirst={i === 0 && current === 1}
                    isLast={i === speakers.length - 1 && current === pages}
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
        unit="speakers"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
