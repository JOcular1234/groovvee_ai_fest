"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  type ZoomPanCallbackProps,
} from "react-simple-maps";
import topo from "world-atlas/countries-110m.json";

import {
  alpha2FromNumeric,
  MAP_REGIONS,
  mapRegionByKey,
  type EventsMapData,
  type MapCityDatum,
  type MapCountryDatum,
  type MapRegionKey,
} from "@/data/map-regions";
import { formatEventDateTime } from "@/lib/datetime";

const GEOGRAPHY = topo as unknown as Parameters<
  typeof Geographies
>[0]["geography"];

type Selection =
  | { kind: "city"; d: MapCityDatum }
  | { kind: "country"; name: string; d: MapCountryDatum | null };

type View = { coordinates: [number, number]; zoom: number };

const NEUTRAL_FILL = "#17171a";
const NEUTRAL_STROKE = "#2c2c31";
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

// Heat fill for a country: volt mixed over the panel ink, intensity scaled
// against the busiest country so the map stays legible at any volume.
function heatFill(count: number, max: number) {
  if (count <= 0) return NEUTRAL_FILL;
  const pct = 14 + Math.round(56 * Math.sqrt(count / Math.max(1, max)));
  return `color-mix(in srgb, var(--color-volt) ${pct}%, var(--color-ink))`;
}

const PINNED_FILL = "color-mix(in srgb, var(--color-volt) 85%, var(--color-ink))";

function sourceBreakdown(g: number, e: number) {
  if (e === 0) return `${g} GrooVVee`;
  if (g === 0) return `${e} external`;
  return `${g} GrooVVee, ${e} external`;
}

const selKey = (s: Selection) =>
  s.kind === "city" ? `c:${s.d.slug}` : `n:${s.name}`;

function selHref(s: Selection): string | null {
  if (s.kind === "city") return `/events/cities/${s.d.slug}`;
  return s.d ? `/events?country=${encodeURIComponent(s.d.country)}` : null;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl leading-none text-white">
        {value}
      </dd>
    </div>
  );
}

const toolBtn = `grid size-10 place-items-center border border-white/15 bg-ink/90 text-white backdrop-blur transition-colors hover:border-volt hover:text-volt disabled:pointer-events-none disabled:opacity-40 ${focusRing}`;

export default function EventsMap({
  data,
  initialRegion = "world",
}: {
  data: EventsMapData;
  initialRegion?: MapRegionKey;
}) {
  const [regionKey, setRegionKey] = useState<MapRegionKey>(initialRegion);
  const region = mapRegionByKey(regionKey);
  const [view, setView] = useState<View>({
    coordinates: region.center as [number, number],
    zoom: region.zoom,
  });
  // hover previews; click / Enter pins (needed for touch, where there is no hover)
  const [hover, setHover] = useState<Selection | null>(null);
  const [pinned, setPinned] = useState<Selection | null>(null);

  const cities = useMemo(
    () => data.cities.filter((c) => region.matches(c)),
    [data.cities, region]
  );
  const sortedCities = useMemo(
    () =>
      [...cities].sort(
        (a, b) =>
          b.upcomingCount - a.upcomingCount ||
          b.publishedCount - a.publishedCount
      ),
    [cities]
  );
  const countryByCode = useMemo(
    () => new Map(data.countries.map((c) => [c.countryCode, c])),
    [data.countries]
  );
  const maxCountry = Math.max(1, ...data.countries.map((c) => c.publishedCount));

  const regionTotals = useMemo(() => {
    const t = { published: 0, upcoming: 0, g: 0, e: 0 };
    for (const c of data.countries) {
      if (!region.matches(c)) continue;
      t.published += c.publishedCount;
      t.upcoming += c.upcomingCount;
      t.g += c.groovveeCount;
      t.e += c.externalCount;
    }
    return t;
  }, [data.countries, region]);

  const selectRegion = (key: MapRegionKey) => {
    const r = mapRegionByKey(key);
    setRegionKey(key);
    setView({ coordinates: r.center as [number, number], zoom: r.zoom });
    setPinned(null);
    setHover(null);
  };
  const zoomBy = (f: number) =>
    setView((v) => ({
      ...v,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * f)),
    }));
  const resetView = () =>
    setView({ coordinates: region.center as [number, number], zoom: region.zoom });

  const pin = (s: Selection) => setPinned(s);
  const onKeyPin = (s: Selection) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pin(s);
    }
  };

  const sel = hover ?? pinned;
  const previewing = !!hover && (!pinned || selKey(hover) !== selKey(pinned));
  const ctaHref = !previewing && pinned ? selHref(pinned) : null;
  const k = view.zoom;

  return (
    <div className="mt-8">
      {/* Region switcher */}
      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Map region"
      >
        {MAP_REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => selectRegion(r.key)}
            aria-pressed={regionKey === r.key}
            className={`min-h-11 shrink-0 border px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${focusRing} ${
              regionKey === r.key
                ? "border-volt bg-volt text-ink"
                : "border-white/20 text-white/80 hover:border-volt hover:text-volt"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Map */}
        <div className="relative border border-white/10 bg-panel">
          <ComposableMap
            projectionConfig={{ scale: 150 }}
            className="h-auto w-full"
            aria-label={`Event map — ${region.label}`}
            role="group"
          >
            <ZoomableGroup
              center={view.coordinates}
              zoom={view.zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onMoveEnd={(p: ZoomPanCallbackProps) =>
                setView((v) => ({
                  coordinates: p.coordinates ?? v.coordinates,
                  zoom: p.zoom ?? v.zoom,
                }))
              }
            >
              <Geographies geography={GEOGRAPHY}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const code = alpha2FromNumeric(
                      geo.id as string | number | undefined
                    );
                    const d = code ? countryByCode.get(code) : undefined;
                    const name =
                      (geo.properties as { name?: string } | undefined)?.name ??
                      d?.country ??
                      "Unknown";
                    const active = !!d && d.publishedCount > 0;
                    const isPinned =
                      pinned?.kind === "country" && pinned.name === name;
                    const s: Selection = { kind: "country", name, d: d ?? null };
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          isPinned
                            ? PINNED_FILL
                            : heatFill(d?.publishedCount ?? 0, maxCountry)
                        }
                        stroke={isPinned ? "var(--color-volt)" : NEUTRAL_STROKE}
                        strokeWidth={(isPinned ? 1 : 0.5) / k}
                        tabIndex={active ? 0 : -1}
                        role={active ? "button" : undefined}
                        aria-pressed={active ? isPinned : undefined}
                        aria-label={
                          active
                            ? `${d.country}: ${d.publishedCount} published events, ${d.upcomingCount} upcoming`
                            : name
                        }
                        className={
                          active
                            ? "cursor-pointer outline-none transition-[fill] hover:fill-volt focus-visible:stroke-volt"
                            : "outline-none transition-[fill] hover:fill-[#1d1d21]"
                        }
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(s)}
                        onBlur={() => setHover(null)}
                        onClick={() => active && pin(s)}
                        onKeyDown={active ? onKeyPin(s) : undefined}
                      />
                    );
                  })
                }
              </Geographies>

              {cities.map((c) => {
                const place = c.stateProvince
                  ? `${c.name}, ${c.stateProvince}, ${c.country}`
                  : `${c.name}, ${c.country}`;
                const upcoming = c.upcomingCount > 0;
                const s: Selection = { kind: "city", d: c };
                const isPinned = pinned?.kind === "city" && pinned.d.slug === c.slug;
                return (
                  <Marker key={c.slug} coordinates={[c.longitude, c.latitude]}>
                    <g
                      role="button"
                      tabIndex={0}
                      aria-pressed={isPinned}
                      aria-label={`${place}: ${c.publishedCount} published events, ${c.upcomingCount} upcoming`}
                      className="cursor-pointer outline-none"
                      onClick={() => pin(s)}
                      onKeyDown={onKeyPin(s)}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(s)}
                      onBlur={() => setHover(null)}
                    >
                      <title>{`${place} — ${c.publishedCount} events`}</title>
                      {/* enlarged invisible hit target for touch; sizes are divided by
                          zoom so markers keep a constant on-screen size */}
                      <circle r={12 / k} fill="transparent" />
                      {isPinned && (
                        <circle
                          r={9 / k}
                          fill="none"
                          stroke="var(--color-volt)"
                          strokeWidth={1.5 / k}
                        />
                      )}
                      <circle
                        r={4.5 / k}
                        fill={upcoming ? "var(--color-volt)" : "#6b6b72"}
                        stroke="#0c0c0e"
                        strokeWidth={1.2 / k}
                      />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* Zoom controls — usable without a wheel or pinch */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            <button
              type="button"
              className={toolBtn}
              onClick={() => zoomBy(1.6)}
              disabled={view.zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <Plus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={toolBtn}
              onClick={() => zoomBy(1 / 1.6)}
              disabled={view.zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={toolBtn}
              onClick={resetView}
              aria-label="Reset map view"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Details panel */}
        <aside
          aria-label="Map details"
          className="border border-white/10 bg-panel p-5 lg:sticky lg:top-36 lg:self-start"
        >
          {sel ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {sel.kind === "city" ? "City" : "Country"}
                  </p>
                  <h3 className="mt-1 font-display text-2xl uppercase leading-tight text-white">
                    {sel.kind === "city" ? sel.d.name : (sel.d?.country ?? sel.name)}
                  </h3>
                  {sel.kind === "city" && (
                    <p className="mt-1 text-sm text-muted">
                      {[sel.d.stateProvince, sel.d.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
                {pinned && !previewing && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinned(null);
                      setHover(null);
                    }}
                    aria-label="Clear selection"
                    className={`-mr-1 -mt-1 grid size-9 shrink-0 place-items-center text-muted transition-colors hover:text-volt ${focusRing}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              {sel.kind === "country" && !sel.d ? (
                <p className="mt-4 text-sm text-muted">
                  No published events yet.
                </p>
              ) : (
                <>
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
                    <Stat
                      label="Published"
                      value={sel.d!.publishedCount}
                    />
                    <Stat label="Upcoming" value={sel.d!.upcomingCount} />
                  </dl>
                  <p className="mt-3 text-xs text-muted">
                    {sourceBreakdown(sel.d!.groovveeCount, sel.d!.externalCount)}
                  </p>

                  {sel.kind === "city" && sel.d.nextUpcoming && (
                    <div className="mt-5 border-t border-white/10 pt-5">
                      <p className="text-xs text-muted">Next event</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {sel.d.nextUpcoming.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatEventDateTime(
                          new Date(sel.d.nextUpcoming.startsAt),
                          sel.d.nextUpcoming.timezone
                        )}
                      </p>
                    </div>
                  )}

                  {ctaHref ? (
                    <Link
                      href={ctaHref}
                      className={`mt-6 flex min-h-11 w-full items-center justify-center gap-2 bg-volt px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white ${focusRing}`}
                    >
                      {sel.kind === "city"
                        ? `Events in ${sel.d.name}`
                        : `Events in ${sel.d?.country}`}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <p className="mt-6 text-xs text-muted">
                      Select to keep this open and see its events.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted">Region</p>
              <h3 className="mt-1 font-display text-2xl uppercase leading-tight text-white">
                {region.label}
              </h3>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
                <Stat label="Published" value={regionTotals.published} />
                <Stat label="Upcoming" value={regionTotals.upcoming} />
              </dl>
              <p className="mt-3 text-xs text-muted">
                {sourceBreakdown(regionTotals.g, regionTotals.e)}
              </p>
              {data.unmatchedCountryEvents > 0 && regionKey === "world" && (
                <p className="mt-3 text-xs text-muted">
                  Plus {data.unmatchedCountryEvents} more in locations we can&apos;t
                  map yet.
                </p>
              )}
              <p className="mt-6 border-t border-white/10 pt-5 text-sm text-muted">
                Select a city or a shaded country to see its events.
              </p>
            </>
          )}
        </aside>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
        <span className="flex items-center gap-2">
          Fewer events
          <span
            aria-hidden
            className="h-2.5 w-24 border border-white/15"
            style={{
              background:
                "linear-gradient(to right, color-mix(in srgb, var(--color-volt) 14%, var(--color-ink)), color-mix(in srgb, var(--color-volt) 70%, var(--color-ink)))",
            }}
          />
          More events
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-volt" aria-hidden />
          City with upcoming events
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-[#6b6b72]" aria-hidden />
          City with past events only
        </span>
      </div>

      {/* Touch- and keyboard-friendly city list */}
      {sortedCities.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-2xl uppercase">
            Active cities in {region.label}
          </h3>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sortedCities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/events/cities/${c.slug}`}
                  className={`flex min-h-14 items-center justify-between gap-3 border border-white/10 bg-panel px-4 py-3 transition-colors hover:border-volt ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.country}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    <span className="block text-white">
                      {c.publishedCount} {c.publishedCount === 1 ? "event" : "events"}
                    </span>
                    {c.upcomingCount > 0 && (
                      <span className="block text-volt">
                        {c.upcomingCount} upcoming
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}