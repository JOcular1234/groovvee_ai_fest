import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { CalendarDays, MapPin, Search, SlidersHorizontal, X } from "lucide-react";

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

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

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

const formatShort = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

type FilterChip = { key: string; label: string; href: string };

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

  const now = new Date();

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: query || undefined,
      status,
      source,
      region,
      country,
      location: locationId,
      sort: sort !== "date" ? sort : undefined,
      page: undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/events${s ? `?${s}` : ""}`;
  };
  const pageHref = (p: number) => href({ page: p > 1 ? String(p) : undefined });

  const filtered = !!(query || status || source || region || country || locationId);
  const advancedCount = [source, region, country, locationId].filter(Boolean).length;
  const clearAllHref = href({
    q: undefined,
    status: undefined,
    source: undefined,
    region: undefined,
    country: undefined,
    location: undefined,
  });

  const chips: FilterChip[] = [];
  if (query)
    chips.push({ key: "q", label: `“${query}”`, href: href({ q: undefined }) });
  if (source)
    chips.push({
      key: "source",
      label: EVENT_SOURCE_LABELS[source] ?? source,
      href: href({ source: undefined }),
    });
  if (region)
    chips.push({ key: "region", label: region, href: href({ region: undefined }) });
  if (country)
    chips.push({ key: "country", label: country, href: href({ country: undefined }) });
  if (locationId) {
    const loc = locations.find((l) => l.id === locationId);
    chips.push({
      key: "location",
      label: loc ? locationLabel(loc) : "Location",
      href: href({ location: undefined }),
    });
  }

  const tabs = [
    { key: "all", label: "All", href: href({ status: undefined }), active: !status },
    {
      key: "published",
      label: "Published",
      href: href({ status: "published" }),
      active: status === "published",
    },
    {
      key: "draft",
      label: "Drafts",
      href: href({ status: "draft" }),
      active: status === "draft",
    },
  ];

  const placeOf = (e: (typeof events)[number]) =>
    e.isOnline
      ? "Online"
      : [e.city, e.stateProvince, e.country].filter(Boolean).join(", ") || "—";

  const metaOf = (e: (typeof events)[number]) =>
    [EVENT_SOURCE_LABELS[e.source] ?? e.source, e.community?.name]
      .filter(Boolean)
      .join(" · ");

  const actionLinks = (e: (typeof events)[number]) => (
    <>
      <Link href={`/admin/events/${e.id}/edit`} className={adminLinkClass}>
        Edit
      </Link>
      <Link href={`/admin/events/${e.id}/registrations`} className={adminLinkClass}>
        Registrations
        {e._count.registrations > 0 && (
          <span className="bg-volt px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
            {e._count.registrations}
          </span>
        )}
      </Link>
    </>
  );

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content"
        title="Events"
        action={{ href: "/admin/events/new", label: "Add event" }}
      />

      {/* Status tabs */}
      <nav
        aria-label="Event status"
        className="mt-6 flex gap-6 border-b border-white/10"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${focusRing} ${
              t.active
                ? "border-volt text-volt"
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Search + filters */}
      <form
        action="/admin/events"
        role="search"
        className="mt-5 border border-white/10 bg-panel p-4"
      >
        {status && <input type="hidden" name="status" value={status} />}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="admin-q" className="sr-only">
              Search events
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="admin-q"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search title or city…"
              className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-muted/50 focus:border-volt"
            />
          </div>
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center justify-center bg-volt px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`}
          >
            Search
          </button>
        </div>

        <details open={advancedCount > 0 || sort !== "date"} className="group mt-3">
          <summary
            className={`inline-flex min-h-9 cursor-pointer list-none items-center gap-2 text-sm text-muted transition-colors hover:text-white [&::-webkit-details-marker]:hidden ${focusRing}`}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters &amp; sorting
            {advancedCount > 0 && (
              <span className="bg-volt px-1.5 font-mono text-[10px] font-bold text-ink">
                {advancedCount}
              </span>
            )}
          </summary>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                {
                  id: "source",
                  label: "Source",
                  value: source ?? "",
                  all: "All sources",
                  options: EVENT_SOURCES.map((s) => ({ v: s.value, l: s.label })),
                },
                {
                  id: "region",
                  label: "Region",
                  value: region ?? "",
                  all: "All regions",
                  options: regions.map((r) => ({ v: r, l: r })),
                },
                {
                  id: "country",
                  label: "Country",
                  value: country ?? "",
                  all: "All countries",
                  options: countries.map((c) => ({ v: c, l: c })),
                },
                {
                  id: "location",
                  label: "Location",
                  value: locationId ?? "",
                  all: "All locations",
                  options: locations.map((l) => ({ v: l.id, l: locationLabel(l) })),
                },
              ] as const
            ).map((f) => (
              <div key={f.id}>
                <label htmlFor={`admin-${f.id}`} className="mb-1.5 block text-xs text-muted">
                  {f.label}
                </label>
                <select
                  id={`admin-${f.id}`}
                  name={f.id}
                  defaultValue={f.value}
                  className={`${adminSelectClass} w-full`}
                >
                  <option value="">{f.all}</option>
                  {f.options.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label htmlFor="admin-sort" className="mb-1.5 block text-xs text-muted">
                Sort by
              </label>
              <select
                id="admin-sort"
                name="sort"
                defaultValue={sort}
                className={`${adminSelectClass} w-full`}
              >
                <option value="date">Event date</option>
                <option value="recent">Recently updated</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className={`inline-flex min-h-11 w-full items-center justify-center border border-white/25 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt ${focusRing}`}
              >
                Apply filters
              </button>
            </div>
          </div>
        </details>
      </form>

      {/* Active filters + result count */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p role="status" aria-live="polite" className="mr-2 text-sm text-muted">
          {total} {total === 1 ? "event" : "events"}
          {pages > 1 && (
            <>
              {" "}
              · page {current} of {pages}
            </>
          )}
        </p>
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            aria-label={`Remove filter: ${c.label}`}
            className={`inline-flex min-h-9 items-center gap-1.5 border border-volt/40 bg-volt/10 px-3 text-sm text-white transition-colors hover:border-volt ${focusRing}`}
          >
            {c.label}
            <X className="size-3.5 text-volt" aria-hidden />
          </Link>
        ))}
        {filtered && (
          <Link
            href={clearAllHref}
            className={`px-2 py-2 text-sm text-muted underline-offset-4 transition-colors hover:text-volt hover:underline ${focusRing}`}
          >
            Clear all
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="mt-4">
          <AdminEmptyState>
            {filtered ? (
              <>
                No events match these filters.{" "}
                <Link href={clearAllHref} className={adminLinkClass}>
                  Clear all filters
                </Link>
              </>
            ) : (
              <>
                No events yet.{" "}
                <Link href="/admin/events/new" className={adminLinkClass}>
                  Add your first event
                </Link>{" "}
                to get started.
              </>
            )}
          </AdminEmptyState>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="mt-4 hidden md:block">
            <AdminTable
              minW="min-w-200"
              headers={[
                { label: "Event" },
                { label: "When" },
                { label: "Where" },
                { label: "Status" },
                { label: "Actions", align: "right" },
              ]}
            >
              {events.map((e, i) => {
                const past = e.startsAt < now;
                return (
                  <tr key={e.id} className={adminTrClass}>
                    <td className={`${adminTdClass} max-w-xs`}>
                      <Link
                        href={`/admin/events/${e.id}/edit`}
                        className={`block truncate font-semibold text-white transition-colors hover:text-volt ${focusRing}`}
                      >
                        {e.title}
                      </Link>
                      <div className="truncate font-mono text-xs text-muted">
                        /events/{e.slug}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted">
                        {metaOf(e)}
                      </div>
                    </td>
                    <td className={`${adminTdClass} whitespace-nowrap text-xs`}>
                      <span className={past ? "text-muted" : "text-white"}>
                        {formatDate(e.startsAt, e.timezone)}
                      </span>
                      <div className="font-mono text-[10px] text-muted">
                        {e.timezone}
                        {past && <span className="ml-2 uppercase">· Past</span>}
                      </div>
                    </td>
                    <td className={`${adminTdClass} max-w-48 text-xs text-muted`}>
                      {placeOf(e)}
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
                      <div className="mt-1.5 font-mono text-[10px] text-muted">
                        Updated {formatShort(e.updatedAt)}
                      </div>
                    </td>
                    <td className={adminTdClass}>
                      <div className="flex items-center justify-end gap-3">
                        {actionLinks(e)}
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
                );
              })}
            </AdminTable>
          </div>

          {/* Mobile: cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {events.map((e, i) => {
              const past = e.startsAt < now;
              return (
                <li key={e.id} className="border border-white/10 bg-panel p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={e.published ? "volt" : "muted"}>
                      {e.published ? "Published" : "Draft"}
                    </StatusBadge>
                    {e.featured && (
                      <span className="bg-volt px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                        Featured
                      </span>
                    )}
                    {past && (
                      <span className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                        Past
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/admin/events/${e.id}/edit`}
                    className={`mt-3 block font-semibold leading-snug text-white ${focusRing}`}
                  >
                    {e.title}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted">
                    /events/{e.slug}
                  </p>
                  <p className="mt-3 flex items-start gap-2 text-xs text-white/80">
                    <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-volt" aria-hidden />
                    <span>
                      {formatDate(e.startsAt, e.timezone)}
                      <span className="ml-2 font-mono text-[10px] text-muted">
                        {e.timezone}
                      </span>
                    </span>
                  </p>
                  <p className="mt-1.5 flex items-start gap-2 text-xs text-white/80">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-volt" aria-hidden />
                    {placeOf(e)}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {metaOf(e)} · Updated {formatShort(e.updatedAt)}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                    <div className="flex items-center gap-4">{actionLinks(e)}</div>
                    <EventRowActions
                      id={e.id}
                      title={e.title}
                      published={e.published}
                      featured={e.featured}
                      isFirst={i === 0 && current === 1}
                      isLast={i === events.length - 1 && current === pages}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
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