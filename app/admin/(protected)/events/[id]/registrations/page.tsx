import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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
} from "@/components/admin/ui";
import { db, withDbRetry } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { listRegistrationsForAdmin } from "@/lib/registrations";

export const metadata: Metadata = {
  title: "Registrations · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);

  const [event, { registrations, total, page: current, pages }] =
    await withDbRetry(async () =>
      Promise.all([
        getEventById(db, id),
        listRegistrationsForAdmin(db, id, {
          q: query || undefined,
          page: Number(sp.page) || 1,
        }),
      ])
    );
  if (!event) notFound();

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/events/${id}/registrations${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Events"
        title={`Registrations — ${event.title}`}
        action={{
          href: `/admin/events/${id}/registrations/export`,
          label: "Export CSV",
        }}
      />

      <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {total} registered ·{" "}
        <Link href={`/admin/events/${id}/edit`} className={adminLinkClass}>
          Edit event
        </Link>{" "}
        ·{" "}
        <Link href={`/events/${event.slug}`} className={adminLinkClass}>
          View public page
        </Link>
      </p>

      <AdminSearchBar
        action={`/admin/events/${id}/registrations`}
        placeholder="Search name, email or organization…"
        query={query}
      />

      {registrations.length === 0 ? (
        <AdminEmptyState>
          {query
            ? "No registrations match this search."
            : "No registrations yet."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-150"
          headers={[
            { label: "Name" },
            { label: "Email" },
            { label: "Organization" },
            { label: "Registered" },
          ]}
        >
          {registrations.map((r) => (
            <tr key={r.id} className={adminTrClass}>
              <td className={`${adminTdClass} font-semibold text-white`}>
                {r.name}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {r.email}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {r.organization ?? "—"}
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(r.createdAt)}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination
        page={current}
        pages={pages}
        total={total}
        unit="registrations"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
