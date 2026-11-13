// import type { Metadata } from "next";
// import { connection } from "next/server";
// import { ArrowUpRight, Search } from "lucide-react";
// import Image from "next/image";
// import Link from "next/link";

// import { EventCalendar } from "@/components/events/EventCalendar";
// import { EventCard } from "@/components/events/EventCard";
// import { EventsMapLazy } from "@/components/events/EventsMapLazy";
// import { mapRegionByKey } from "@/data/map-regions";
// import {
//   currentMonth,
//   groupEventsByDate,
//   monthFetchRange,
//   monthLabel,
//   monthParam,
//   parseMonthParam,
//   shiftMonth,
// } from "@/lib/calendar";
// import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
// import { locationLabel } from "@/lib/locations";
// import {
//   getFeaturedOrNextEvent,
//   getPublicEventFilterOptions,
//   getPublicEvents,
//   getPublicEventsInRange,
// } from "@/lib/public/events";
// import { getCityIndex, getEventsMapData } from "@/lib/public/locations";
// import { EVENT_SOURCES } from "@/lib/validation/event";

// export const metadata: Metadata = {
//   title: "Events",
//   description:
//     "Discover GrooVVee events worldwide — campus meetups, community gatherings, hackathons and AI festivals, across cities and timezones.",
//   openGraph: {
//     title: "GrooVVee Events",
//     description:
//       "A global calendar of AI community events — meetups, hackathons and festivals.",
//   },
// };

// // Uses searchParams filters — renders per request over cached queries.
// export const instant = false;

// const selectClass =
//   "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";

// export default async function EventsPage({
//   searchParams,
// }: {
//   searchParams: Promise<{
//     q?: string;
//     region?: string;
//     country?: string;
//     location?: string;
//     source?: string;
//     view?: string;
//     month?: string;
//     map?: string;
//     page?: string;
//   }>;
// }) {
//   // Renders per request (filters + current month depend on now).
//   await connection();
//   const sp = await searchParams;
//   const q = (sp.q ?? "").trim().slice(0, 120);
//   const region = sp.region || undefined;
//   const country = sp.country || undefined;
//   const locationId = sp.location || undefined;
//   const source: "GROOVVEE" | "EXTERNAL" | undefined =
//     sp.source === "GROOVVEE" || sp.source === "EXTERNAL" ? sp.source : undefined;
//   const view =
//     sp.view === "calendar"
//       ? "calendar"
//       : sp.view === "past"
//         ? "past"
//         : sp.view === "map"
//           ? "map"
//           : "upcoming";
//   const isCalendar = view === "calendar";
//   const isMap = view === "map";
//   const initialMapRegion = mapRegionByKey(sp.map).key;
//   const thisMonth = currentMonth();
//   const month = parseMonthParam(sp.month) ?? thisMonth;
//   const page = Math.max(1, Number(sp.page) || 1);
//   const filtered = !!(q || region || country || locationId || source);

//   const filters = { q: q || undefined, region, country, source, locationId };

//   const optionsP = getPublicEventFilterOptions();
//   const cityIndexP = getCityIndex();
//   const heroP =
//     view === "upcoming" && !filtered && page === 1
//       ? getFeaturedOrNextEvent()
//       : Promise.resolve(null);

//   let result: Awaited<ReturnType<typeof getPublicEvents>> | null = null;
//   let byDate: Map<
//     string,
//     Awaited<ReturnType<typeof getPublicEventsInRange>>[number][]
//   > | null = null;
//   let mapData: Awaited<ReturnType<typeof getEventsMapData>> | null = null;
//   if (isCalendar) {
//     const { from, to } = monthFetchRange(month);
//     const inRange = await getPublicEventsInRange(from, to, filters);
//     byDate = groupEventsByDate(inRange, month);
//   } else if (isMap) {
//     mapData = await getEventsMapData();
//   } else {
//     result = await getPublicEvents(
//       filters,
//       view === "past" ? "past" : "upcoming",
//       page
//     );
//   }
//   const [options, cityIndex, hero] = await Promise.all([
//     optionsP,
//     cityIndexP,
//     heroP,
//   ]);

//   const href = (over: Record<string, string | undefined>) => {
//     const params = new URLSearchParams();
//     const merged: Record<string, string | undefined> = {
//       q: q || undefined,
//       region,
//       country,
//       location: locationId,
//       source,
//       view: view === "upcoming" ? undefined : view,
//       month: isCalendar ? monthParam(month) : undefined,
//       page: undefined,
//       ...over,
//     };
//     for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
//     const s = params.toString();
//     return `/events${s ? `?${s}` : ""}`;
//   };

//   return (
//     <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
//       <div className="bg-grid absolute inset-0" aria-hidden />
//       <div className="relative mx-auto max-w-7xl">
//         <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
//           <span className="inline-block size-2 bg-volt" aria-hidden />
//           Global calendar
//         </p>
//         <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
//           Discover what&apos;s happening in AI<span className="text-volt">.</span>
//         </h1>
//         <p className="mt-6 max-w-2xl text-muted">
//           Campus meetups, community gatherings, hackathons and festivals —
//           GrooVVee events happening across cities, countries and timezones.
//         </p>

//         {hero && (
//           <Link
//             href={`/events/${hero.slug}`}
//             className="group mt-12 grid overflow-hidden border border-volt/40 bg-panel transition-colors hover:border-volt lg:grid-cols-[3fr_2fr]"
//           >
//             <div className="relative min-h-64 bg-ink lg:min-h-96">
//               {hero.imageUrl ? (
//                 <Image
//                   src={hero.imageUrl}
//                   alt={hero.title}
//                   fill
//                   priority
//                   sizes="(min-width: 1024px) 60vw, 100vw"
//                   className="object-cover transition-transform duration-500 group-hover:scale-105"
//                 />
//               ) : (
//                 <span
//                   aria-hidden
//                   className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
//                 >
//                   {hero.title.slice(0, 2).toUpperCase()}
//                 </span>
//               )}
//             </div>
//             <div className="flex flex-col justify-center p-8 sm:p-10">
//               <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
//                 Featured event
//               </p>
//               <h2 className="mt-4 font-display text-3xl uppercase leading-tight sm:text-4xl">
//                 {hero.title}
//               </h2>
//               <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-white">
//                 {formatEventDateTime(hero.startsAt, hero.timezone)}
//               </p>
//               <p className="mt-1 text-xs text-muted">
//                 {timeZoneLabel(hero.startsAt, hero.timezone)}
//               </p>
//               <p className="mt-4 text-sm text-muted">
//                 {hero.isOnline
//                   ? "Online event"
//                   : [hero.venueName, [hero.city, hero.country].filter(Boolean).join(", ")]
//                       .filter(Boolean)
//                       .join(" · ") || "Location TBA"}
//               </p>
//               <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">
//                 {hero.description}
//               </p>
//               <span className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
//                 View event
//                 <ArrowUpRight className="size-4" aria-hidden />
//               </span>
//             </div>
//           </Link>
//         )}

//         <form action="/events" className="mt-12 flex flex-wrap items-end gap-2">
//           <div className="relative min-w-55 flex-1">
//             <Search
//               className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
//               aria-hidden
//             />
//             <input
//               type="search"
//               name="q"
//               defaultValue={q}
//               placeholder="Search events, cities, venues…"
//               className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
//             />
//           </div>
//           <select name="region" defaultValue={region ?? ""} className={selectClass}>
//             <option value="">All regions</option>
//             {options.regions.map((r) => (
//               <option key={r} value={r}>
//                 {r}
//               </option>
//             ))}
//           </select>
//           <select name="country" defaultValue={country ?? ""} className={selectClass}>
//             <option value="">All countries</option>
//             {options.countries.map((c) => (
//               <option key={c} value={c}>
//                 {c}
//               </option>
//             ))}
//           </select>
//           <select
//             name="location"
//             defaultValue={locationId ?? ""}
//             className={selectClass}
//           >
//             <option value="">All cities</option>
//             {cityIndex.cities.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {locationLabel(c)}
//               </option>
//             ))}
//           </select>
//           <select name="source" defaultValue={source ?? ""} className={selectClass}>
//             <option value="">All events</option>
//             {EVENT_SOURCES.map((s) => (
//               <option key={s.value} value={s.value}>
//                 {s.label}
//               </option>
//             ))}
//           </select>
//           {view !== "upcoming" && (
//             <input type="hidden" name="view" value={view} />
//           )}
//           {isCalendar && (
//             <input type="hidden" name="month" value={monthParam(month)} />
//           )}
//           <button
//             type="submit"
//             className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
//           >
//             Filter
//           </button>
//           {filtered && (
//             <Link
//               href={href({
//                 q: undefined,
//                 region: undefined,
//                 country: undefined,
//                 location: undefined,
//                 source: undefined,
//               })}
//               className="px-2 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
//             >
//               Clear
//             </Link>
//           )}
//         </form>

//         <div className="mt-10 flex items-end justify-between gap-6 border-b border-white/10 font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
//           <div className="flex gap-6">
//             <Link
//               href={href({ view: undefined, month: undefined })}
//               className={`pb-3 transition-colors ${
//                 view === "upcoming"
//                   ? "border-b-2 border-volt text-volt"
//                   : "text-muted hover:text-white"
//               }`}
//             >
//               Upcoming
//             </Link>
//             <Link
//               href={href({ view: "past", month: undefined })}
//               className={`pb-3 transition-colors ${
//                 view === "past"
//                   ? "border-b-2 border-volt text-volt"
//                   : "text-muted hover:text-white"
//               }`}
//             >
//               Past events
//             </Link>
//             <Link
//               href={href({ view: "calendar", month: undefined })}
//               className={`pb-3 transition-colors ${
//                 isCalendar
//                   ? "border-b-2 border-volt text-volt"
//                   : "text-muted hover:text-white"
//               }`}
//             >
//               Calendar
//             </Link>
//             <Link
//               href={href({ view: "map", month: undefined })}
//               className={`pb-3 transition-colors ${
//                 isMap
//                   ? "border-b-2 border-volt text-volt"
//                   : "text-muted hover:text-white"
//               }`}
//             >
//               Map
//             </Link>
//           </div>
//           <Link
//             href="/events/cities"
//             className="pb-3 text-muted transition-colors hover:text-volt"
//           >
//             Cities →
//           </Link>
//         </div>

//         {isCalendar && byDate && (
//           <>
//             <div className="mt-8 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.25em]">
//               <Link
//                 href={href({ month: monthParam(shiftMonth(month, -1)) })}
//                 className="border border-white/25 px-4 py-2 text-white transition-colors hover:border-volt hover:text-volt"
//               >
//                 ← {monthLabel(shiftMonth(month, -1))}
//               </Link>
//               <div className="text-center">
//                 <p className="font-display text-2xl uppercase text-white">
//                   {monthLabel(month)}
//                 </p>
//                 {(month.year !== thisMonth.year ||
//                   month.month !== thisMonth.month) && (
//                   <Link
//                     href={href({ month: undefined })}
//                     className="text-[10px] text-muted transition-colors hover:text-volt"
//                   >
//                     Back to {monthLabel(thisMonth)}
//                   </Link>
//                 )}
//               </div>
//               <Link
//                 href={href({ month: monthParam(shiftMonth(month, 1)) })}
//                 className="border border-white/25 px-4 py-2 text-white transition-colors hover:border-volt hover:text-volt"
//               >
//                 {monthLabel(shiftMonth(month, 1))} →
//               </Link>
//             </div>
//             <EventCalendar month={month} byDate={byDate} filtered={filtered} />
//           </>
//         )}

//         {isMap && mapData && (
//           <EventsMapLazy data={mapData} initialRegion={initialMapRegion} />
//         )}

//         {!isCalendar && !isMap &&
//           result &&
//           (result.events.length === 0 ? (
//             <div className="mt-12 border border-white/10 bg-panel p-12 text-center">
//               <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
//                 {filtered ? "No matches" : "Coming soon"}
//               </p>
//               <p className="mx-auto mt-4 max-w-md text-muted">
//                 {filtered
//                   ? "No events match these filters. Try widening your search."
//                   : view === "upcoming"
//                     ? "No upcoming events are published yet — check back soon."
//                     : "No past events to show yet."}
//               </p>
//             </div>
//           ) : (
//             <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//               {result.events.map((e) => (
//                 <EventCard key={e.id} event={e} />
//               ))}
//             </div>
//           ))}

//         {!isCalendar && result && result.pages > 1 && (
//           <div className="mt-10 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
//             <Link
//               href={href({ page: String(result.page - 1) })}
//               aria-disabled={result.page <= 1}
//               className={`border px-4 py-2 ${
//                 result.page <= 1
//                   ? "pointer-events-none border-white/10 text-muted/40"
//                   : "border-white/25 text-white hover:border-volt hover:text-volt"
//               }`}
//             >
//               ← Prev
//             </Link>
//             <span className="text-muted">
//               Page {result.page} of {result.pages} · {result.total} events
//             </span>
//             <Link
//               href={href({ page: String(result.page + 1) })}
//               aria-disabled={result.page >= result.pages}
//               className={`border px-4 py-2 ${
//                 result.page >= result.pages
//                   ? "pointer-events-none border-white/10 text-muted/40"
//                   : "border-white/25 text-white hover:border-volt hover:text-volt"
//               }`}
//             >
//               Next →
//             </Link>
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }


import type { Metadata } from "next";
import { connection } from "next/server";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EventCalendar } from "@/components/events/EventCalendar";
import { EventCard } from "@/components/events/EventCard";
import { EventsMapLazy } from "@/components/events/EventsMapLazy";
import { mapRegionByKey } from "@/data/map-regions";
import {
  currentMonth,
  groupEventsByDate,
  monthFetchRange,
  monthLabel,
  monthParam,
  parseMonthParam,
  shiftMonth,
} from "@/lib/calendar";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import { locationLabel } from "@/lib/locations";
import {
  getFeaturedOrNextEvent,
  getPublicEventFilterOptions,
  getPublicEvents,
  getPublicEventsInRange,
} from "@/lib/public/events";
import { getCityIndex, getEventsMapData } from "@/lib/public/locations";
import { EVENT_SOURCES } from "@/lib/validation/event";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Discover GrooVVee events worldwide — campus meetups, community gatherings, hackathons and AI festivals, across cities and timezones.",
  openGraph: {
    title: "GrooVVee Events",
    description:
      "A global calendar of AI community events — meetups, hackathons and festivals.",
  },
};

// Uses searchParams filters — renders per request over cached queries.
export const instant = false;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const fieldClass = `w-full border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-volt`;

const outlineBtn = `inline-flex min-h-11 items-center justify-center gap-2 border border-white/25 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt ${focusRing}`;

const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 bg-volt px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`;

type FilterChip = { key: string; label: string; href: string };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    region?: string;
    country?: string;
    location?: string;
    source?: string;
    view?: string;
    month?: string;
    map?: string;
    page?: string;
  }>;
}) {
  // Renders per request (filters + current month depend on now).
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const region = sp.region || undefined;
  const country = sp.country || undefined;
  const locationId = sp.location || undefined;
  const source: "GROOVVEE" | "EXTERNAL" | undefined =
    sp.source === "GROOVVEE" || sp.source === "EXTERNAL" ? sp.source : undefined;
  const view =
    sp.view === "calendar"
      ? "calendar"
      : sp.view === "past"
        ? "past"
        : sp.view === "map"
          ? "map"
          : "upcoming";
  const isCalendar = view === "calendar";
  const isMap = view === "map";
  const initialMapRegion = mapRegionByKey(sp.map).key;
  const thisMonth = currentMonth();
  const month = parseMonthParam(sp.month) ?? thisMonth;
  const page = Math.max(1, Number(sp.page) || 1);
  const filtered = !!(q || region || country || locationId || source);

  const filters = { q: q || undefined, region, country, source, locationId };

  const optionsP = getPublicEventFilterOptions();
  const cityIndexP = getCityIndex();
  const heroP =
    view === "upcoming" && !filtered && page === 1
      ? getFeaturedOrNextEvent()
      : Promise.resolve(null);

  let result: Awaited<ReturnType<typeof getPublicEvents>> | null = null;
  let byDate: Map<
    string,
    Awaited<ReturnType<typeof getPublicEventsInRange>>[number][]
  > | null = null;
  let mapData: Awaited<ReturnType<typeof getEventsMapData>> | null = null;
  if (isCalendar) {
    const { from, to } = monthFetchRange(month);
    const inRange = await getPublicEventsInRange(from, to, filters);
    byDate = groupEventsByDate(inRange, month);
  } else if (isMap) {
    mapData = await getEventsMapData();
  } else {
    result = await getPublicEvents(
      filters,
      view === "past" ? "past" : "upcoming",
      page
    );
  }
  const [options, cityIndex, hero] = await Promise.all([
    optionsP,
    cityIndexP,
    heroP,
  ]);

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      region,
      country,
      location: locationId,
      source,
      view: view === "upcoming" ? undefined : view,
      month: isCalendar ? monthParam(month) : undefined,
      page: undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/events${s ? `?${s}` : ""}`;
  };

  const clearAllHref = href({
    q: undefined,
    region: undefined,
    country: undefined,
    location: undefined,
    source: undefined,
  });

  // Removable chips, one per active filter
  const chips: FilterChip[] = [];
  if (q) chips.push({ key: "q", label: `“${q}”`, href: href({ q: undefined }) });
  if (region)
    chips.push({ key: "region", label: region, href: href({ region: undefined }) });
  if (country)
    chips.push({ key: "country", label: country, href: href({ country: undefined }) });
  if (locationId) {
    const city = cityIndex.cities.find((c) => c.id === locationId);
    chips.push({
      key: "location",
      label: city ? locationLabel(city) : "City",
      href: href({ location: undefined }),
    });
  }
  if (source)
    chips.push({
      key: "source",
      label: EVENT_SOURCES.find((s) => s.value === source)?.label ?? source,
      href: href({ source: undefined }),
    });

  const tabs = [
    { key: "upcoming", label: "Upcoming", href: href({ view: undefined, month: undefined }) },
    { key: "past", label: "Past", href: href({ view: "past", month: undefined }) },
    { key: "calendar", label: "Calendar", href: href({ view: "calendar", month: undefined }) },
    { key: "map", label: "Map", href: href({ view: "map", month: undefined }) },
  ];

  const heroLocation = hero
    ? hero.isOnline
      ? "Online event"
      : [
          hero.venueName,
          [hero.city, hero.country].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(", ") || "Location TBA"
    : "";

  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    // overflow-x-clip (not hidden) so the sticky tab bar can still stick
    <section className="relative overflow-x-clip pt-32 pb-24 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />

      {/* Page header */}
      <header className="relative w-full px-5 sm:px-10 2xl:px-16">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Global calendar
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          Discover what&apos;s happening in AI<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          Campus meetups, community gatherings, hackathons and festivals —
          GrooVVee events happening across cities, countries and timezones.
        </p>
        <Link
          href="/events/cities"
          className={`mt-8 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-volt ${focusRing}`}
        >
          Browse by city
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </header>

      {/* View switcher — sticks under the navbar */}
      <div className="sticky top-16 z-30 mt-12 border-y border-white/10 bg-ink/90 backdrop-blur-md sm:top-20">
        <nav
          aria-label="Event views"
          className="flex w-full overflow-x-auto px-1 [scrollbar-width:none] sm:px-6 2xl:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((t) => {
            const active = view === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-12 shrink-0 items-center px-4 font-mono text-[11px] font-bold uppercase tracking-[0.25em] transition-colors ${focusRing} ${
                  active ? "text-volt" : "text-muted hover:text-white"
                }`}
              >
                {t.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-volt"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative w-full px-5 sm:px-10 2xl:px-16">
        {/* Filters (they don't apply to the map, so it's hidden there) */}
        {!isMap && (
          <form
            action="/events"
            role="search"
            className="mt-8 border border-white/10 bg-panel p-4 sm:p-5"
          >
            <div className="relative">
              <label htmlFor="f-q" className="sr-only">
                Search events
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="f-q"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search events, cities, venues…"
                className={`${fieldClass} pl-10`}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-end">
              <div>
                <label htmlFor="f-region" className="mb-1.5 block text-xs text-muted">
                  Region
                </label>
                <select id="f-region" name="region" defaultValue={region ?? ""} className={fieldClass}>
                  <option value="">All regions</option>
                  {options.regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-country" className="mb-1.5 block text-xs text-muted">
                  Country
                </label>
                <select id="f-country" name="country" defaultValue={country ?? ""} className={fieldClass}>
                  <option value="">All countries</option>
                  {options.countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-location" className="mb-1.5 block text-xs text-muted">
                  City
                </label>
                <select id="f-location" name="location" defaultValue={locationId ?? ""} className={fieldClass}>
                  <option value="">All cities</option>
                  {cityIndex.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locationLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-source" className="mb-1.5 block text-xs text-muted">
                  Organizer
                </label>
                <select id="f-source" name="source" defaultValue={source ?? ""} className={fieldClass}>
                  <option value="">All events</option>
                  {EVENT_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {view !== "upcoming" && (
                <input type="hidden" name="view" value={view} />
              )}
              {isCalendar && (
                <input type="hidden" name="month" value={monthParam(month)} />
              )}
              <button type="submit" className={`${primaryBtn} sm:col-span-2 lg:col-span-1`}>
                Apply filters
              </button>
            </div>
          </form>
        )}

        {/* Active filters */}
        {!isMap && chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Filtered by</span>
            {chips.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                scroll={false}
                aria-label={`Remove filter: ${c.label}`}
                className={`inline-flex min-h-9 items-center gap-1.5 border border-volt/40 bg-volt/10 px-3 text-sm text-white transition-colors hover:border-volt ${focusRing}`}
              >
                {c.label}
                <X className="size-3.5 text-volt" aria-hidden />
              </Link>
            ))}
            <Link
              href={clearAllHref}
              scroll={false}
              className={`px-2 py-2 text-sm text-muted underline-offset-4 transition-colors hover:text-volt hover:underline ${focusRing}`}
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Featured event */}
        {hero && (
          <Link
            href={`/events/${hero.slug}`}
            className={`group mt-10 grid overflow-hidden border border-volt/40 bg-panel transition-colors hover:border-volt lg:grid-cols-[3fr_2fr] ${focusRing}`}
          >
            <div className="relative min-h-64 bg-ink lg:min-h-96">
              {hero.imageUrl ? (
                <Image
                  src={hero.imageUrl}
                  alt={hero.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
                >
                  {hero.title.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="absolute left-0 top-0 z-10 bg-volt px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
                Featured
              </span>
            </div>
            <div className="flex flex-col justify-center gap-5 p-6 sm:p-10">
              <h2 className="font-display text-3xl uppercase leading-tight sm:text-4xl">
                {hero.title}
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                  <span>
                    <span className="block text-white">
                      {formatEventDateTime(hero.startsAt, hero.timezone)}
                    </span>
                    <span className="block text-xs text-muted">
                      {timeZoneLabel(hero.startsAt, hero.timezone)}
                    </span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                  <span className="text-white/80">{heroLocation}</span>
                </li>
              </ul>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                {hero.description}
              </p>
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
                View event
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>
          </Link>
        )}

        {/* Calendar */}
        {isCalendar && byDate && (
          <>
            <div className="mt-8 grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <Link
                href={href({ month: monthParam(prevMonth) })}
                scroll={false}
                aria-label={`Previous month: ${monthLabel(prevMonth)}`}
                className={outlineBtn}
              >
                <ChevronLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">{monthLabel(prevMonth)}</span>
              </Link>
              <div className="text-center">
                <p className="font-display text-2xl uppercase text-white sm:text-3xl">
                  {monthLabel(month)}
                </p>
                {(month.year !== thisMonth.year ||
                  month.month !== thisMonth.month) && (
                  <Link
                    href={href({ month: undefined })}
                    scroll={false}
                    className={`text-xs text-muted underline-offset-4 transition-colors hover:text-volt hover:underline ${focusRing}`}
                  >
                    Back to {monthLabel(thisMonth)}
                  </Link>
                )}
              </div>
              <Link
                href={href({ month: monthParam(nextMonth) })}
                scroll={false}
                aria-label={`Next month: ${monthLabel(nextMonth)}`}
                className={outlineBtn}
              >
                <span className="hidden sm:inline">{monthLabel(nextMonth)}</span>
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <EventCalendar month={month} byDate={byDate} filtered={filtered} />
          </>
        )}

        {/* Map */}
        {isMap && mapData && (
          <EventsMapLazy data={mapData} initialRegion={initialMapRegion} />
        )}

        {/* List views */}
        {!isCalendar && !isMap && result && (
          <>
            <p
              role="status"
              aria-live="polite"
              className="mt-10 text-sm text-muted"
            >
              {result.total} {view === "past" ? "past" : "upcoming"}{" "}
              {result.total === 1 ? "event" : "events"}
            </p>

            {result.events.length === 0 ? (
              <div className="mt-4 border border-white/10 bg-panel p-8 text-center sm:p-12">
                <p className="font-display text-3xl uppercase">
                  {filtered ? "No matches" : "Nothing here yet"}
                </p>
                <p className="mx-auto mt-4 max-w-md text-muted">
                  {filtered
                    ? "No events match these filters. Try removing one or widening your search."
                    : view === "upcoming"
                      ? "No upcoming events are published yet. Check back soon."
                      : "No past events to show yet."}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {filtered ? (
                    <Link href={clearAllHref} className={primaryBtn}>
                      Clear all filters
                    </Link>
                  ) : view === "upcoming" ? (
                    <Link href={href({ view: "past" })} className={outlineBtn}>
                      Browse past events
                    </Link>
                  ) : (
                    <Link href={href({ view: undefined })} className={outlineBtn}>
                      See upcoming events
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {result.events.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} />
                  </li>
                ))}
              </ul>
            )}

            {result.pages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-12 flex items-center justify-between gap-4 border-t border-white/10 pt-6"
              >
                {result.page <= 1 ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted/40"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Prev
                  </span>
                ) : (
                  <Link
                    rel="prev"
                    href={href({
                      page: result.page - 1 > 1 ? String(result.page - 1) : undefined,
                    })}
                    className={outlineBtn}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Prev
                  </Link>
                )}

                <p className="text-center text-sm text-muted">
                  Page {result.page} of {result.pages}
                  <span className="hidden sm:inline"> · {result.total} events</span>
                </p>

                {result.page >= result.pages ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted/40"
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                ) : (
                  <Link
                    rel="next"
                    href={href({ page: String(result.page + 1) })}
                    className={outlineBtn}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}