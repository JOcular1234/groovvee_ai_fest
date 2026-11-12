import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { EventRowActions } from "@/components/admin/EventRowActions";
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
import { listEventFilterOptions, listEventsForAdmin } from "@/lib/events";
import { listLocationsForSelect, locationLabel } from "@/lib/locations";
import { EVENT_SOURCE_LABELS, EVENT_SOURCES } from "@/lib/validation/event";

export const metadata: Metadata = {
  title: "Events · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

function formatDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    source?: string;
    region?: string;
    country?: string;
    location?: string;
    sort?: string;
  }>;
}) {
  await connection();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 120);
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : undefined;
  const source =
    sp.source === "GROOVVEE" || sp.source === "EXTERNAL" ? sp.source : undefined;
  const region = sp.region || undefined;
  const country = sp.country || undefined;
  const locationId = sp.location || undefined;
  const sort = sp.sort === "recent" ? "recent" : "date";

  const [
    { events, total, page: current, pages },
    { regions, countries },
    locations,
  ] = await withDbRetry(async () =>
    Promise.all([
      listEventsForAdmin(db, {
        q: query || undefined,
        page: Number(sp.page) || 1,
        status,
        source,
        region,
        country,
        locationId,
        sort,
      }),
      listEventFilterOptions(db),
      listLocationsForSelect(db),
    ])
  );

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (region) params.set("region", region);
    if (country) params.set("country", country);
    if (locationId) params.set("location", locationId);
    if (sort !== "date") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/events${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Events"
        action={{ href: "/admin/events/new", label: "Add event" }}
      />

      <AdminSearchBar
        action="/admin/events"
        placeholder="Search title or city…"
        query={query}
      >
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
          name="source"
          defaultValue={source ?? ""}
          className={adminSelectClass}
        >
          <option value="">All sources</option>
          {EVENT_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="region"
          defaultValue={region ?? ""}
          className={adminSelectClass}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          name="country"
          defaultValue={country ?? ""}
          className={adminSelectClass}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="location"
          defaultValue={locationId ?? ""}
          className={adminSelectClass}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationLabel(l)}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={adminSelectClass}>
          <option value="date">By date</option>
          <option value="recent">Recently updated</option>
        </select>
      </AdminSearchBar>

      {events.length === 0 ? (
        <AdminEmptyState>
          {query || status || source || region || country
            ? "No events match these filters."
            : "No events yet. Add your first event to get started."}
        </AdminEmptyState>
      ) : (
        <AdminTable
          minW="min-w-235"
          headers={[
            { label: "Event" },
            { label: "Date" },
            { label: "Location" },
            { label: "Source" },
            { label: "Community" },
            { label: "Status" },
            { label: "Updated" },
            { label: "Actions", align: "right" },
          ]}
        >
          {events.map((e, i) => (
            <tr key={e.id} className={adminTrClass}>
              <td className={adminTdClass}>
                <div className="font-semibold text-white">{e.title}</div>
                <div className="font-mono text-xs text-muted">
                  /events/{e.slug}
                </div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {formatDate(e.startsAt, e.timezone)}
                <div className="font-mono text-[10px]">{e.timezone}</div>
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {e.isOnline
                  ? "Online"
                  : [e.city, e.stateProvince, e.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {EVENT_SOURCE_LABELS[e.source] ?? e.source}
              </td>
              <td className={`${adminTdClass} text-xs text-muted`}>
                {e.community?.name ?? "—"}
              </td>
              <td className={adminTdClass}>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge tone={e.published ? "volt" : "muted"}>
                    {e.published ? "Published" : "Draft"}
                  </StatusBadge>
                  {e.featured && (
                    <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                      Featured
                    </span>
                  )}
                </div>
              </td>
              <td className={`${adminTdClass} font-mono text-xs text-muted`}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(e.updatedAt)}
              </td>
              <td className={adminTdClass}>
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/events/${e.id}/edit`}
                    className={adminLinkClass}
                  >
                    Edit
                  </Link>
                  <EventRowActions
                    id={e.id}
                    title={e.title}
                    published={e.published}
                    featured={e.featured}
                    isFirst={i === 0 && current === 1}
                    isLast={i === events.length - 1 && current === pages}
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
        unit="events"
        href={pageHref}
      />
    </AdminPageShell>
  );
}
