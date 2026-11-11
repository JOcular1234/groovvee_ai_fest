"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
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

const NEUTRAL_FILL = "#17171a";
const NEUTRAL_STROKE = "#2c2c31";

// Heat fill for a country: volt mixed over the panel ink, intensity scaled
// against the busiest country so the map stays legible at any volume.
function heatFill(count: number, max: number) {
  if (count <= 0) return NEUTRAL_FILL;
  const pct = 14 + Math.round(56 * Math.sqrt(count / Math.max(1, max)));
  return `color-mix(in srgb, var(--color-volt) ${pct}%, var(--color-ink))`;
}

function sourceBreakdown(g: number, e: number) {
  if (e === 0) return `${g} GrooVVee`;
  if (g === 0) return `${e} external`;
  return `${g} GrooVVee · ${e} external`;
}

export default function EventsMap({
  data,
  initialRegion = "world",
}: {
  data: EventsMapData;
  initialRegion?: MapRegionKey;
}) {
  const router = useRouter();
  const [regionKey, setRegionKey] = useState<MapRegionKey>(initialRegion);
  const [sel, setSel] = useState<Selection | null>(null);
  const region = mapRegionByKey(regionKey);

  const cities = useMemo(
    () => data.cities.filter((c) => region.matches(c)),
    [data.cities, region]
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

  const go = (href: string) => router.push(href);
  const onKeyGo = (href: string) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go(href);
    }
  };

  return (
    <div className="mt-8">
      {/* Region navigation */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Map region"
      >
        {MAP_REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => {
              setRegionKey(r.key);
              setSel(null);
            }}
            aria-pressed={regionKey === r.key}
            className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
              regionKey === r.key
                ? "border-volt bg-volt text-ink"
                : "border-white/20 text-muted hover:border-volt hover:text-volt"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="border border-white/10 bg-panel">
          <ComposableMap
            projectionConfig={{ scale: 150 }}
            className="h-auto w-full"
            aria-label={`Event map — ${region.label}`}
            role="img"
          >
            <ZoomableGroup
              center={region.center}
              zoom={region.zoom}
              minZoom={1}
              maxZoom={8}
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
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={heatFill(d?.publishedCount ?? 0, maxCountry)}
                        stroke={NEUTRAL_STROKE}
                        strokeWidth={0.5}
                        tabIndex={active ? 0 : -1}
                        role={active ? "link" : undefined}
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
                        onMouseEnter={() =>
                          setSel({ kind: "country", name, d: d ?? null })
                        }
                        onMouseLeave={() => setSel(null)}
                        onFocus={() =>
                          setSel({ kind: "country", name, d: d ?? null })
                        }
                        onBlur={() => setSel(null)}
                        onClick={() =>
                          active &&
                          go(`/events?country=${encodeURIComponent(d.country)}`)
                        }
                        onKeyDown={
                          active
                            ? onKeyGo(
                                `/events?country=${encodeURIComponent(d.country)}`
                              )
                            : undefined
                        }
                      />
                    );
                  })
                }
              </Geographies>

              {cities.map((c) => {
                const href = `/events/cities/${c.slug}`;
                const place = c.stateProvince
                  ? `${c.name}, ${c.stateProvince}, ${c.country}`
                  : `${c.name}, ${c.country}`;
                const upcoming = c.upcomingCount > 0;
                return (
                  <Marker key={c.slug} coordinates={[c.longitude, c.latitude]}>
                    <g
                      role="link"
                      tabIndex={0}
                      aria-label={`${place}: ${c.publishedCount} published events, ${c.upcomingCount} upcoming`}
                      className="cursor-pointer outline-none"
                      onClick={() => go(href)}
                      onKeyDown={onKeyGo(href)}
                      onMouseEnter={() => setSel({ kind: "city", d: c })}
                      onMouseLeave={() => setSel(null)}
                      onFocus={() => setSel({ kind: "city", d: c })}
                      onBlur={() => setSel(null)}
                    >
                      <title>{`${place} — ${c.publishedCount} events`}</title>
                      {/* enlarged invisible hit target for touch */}
                      <circle r={11} fill="transparent" />
                      <circle
                        r={4.5}
                        fill={upcoming ? "var(--color-volt)" : "#6b6b72"}
                        stroke="#0c0c0e"
                        strokeWidth={1.2}
                      />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Summary panel — hover/focus target, else region totals */}
        <div className="border border-white/10 bg-panel p-5 lg:sticky lg:top-24">
          {sel ? (
            sel.kind === "city" ? (
              <>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                  City
                </p>
                <p className="mt-2 font-display text-xl uppercase text-white">
                  {sel.d.name}
                </p>
                <p className="text-xs text-muted">
                  {[sel.d.stateProvince, sel.d.country, sel.d.region]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-3 text-sm text-white">
                  {sel.d.publishedCount} published · {sel.d.upcomingCount} upcoming
                </p>
                <p className="text-xs text-muted">
                  {sourceBreakdown(sel.d.groovveeCount, sel.d.externalCount)}
                </p>
                {sel.d.nextUpcoming && (
                  <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted">
                    Next:{" "}
                    <span className="text-white">{sel.d.nextUpcoming.title}</span>
                    <br />
                    {formatEventDateTime(
                      new Date(sel.d.nextUpcoming.startsAt),
                      sel.d.nextUpcoming.timezone
                    )}
                  </p>
                )}
                <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt">
                  Click marker → city page
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                  Country
                </p>
                <p className="mt-2 font-display text-xl uppercase text-white">
                  {sel.d?.country ?? sel.name}
                </p>
                {sel.d ? (
                  <>
                    <p className="mt-3 text-sm text-white">
                      {sel.d.publishedCount} published · {sel.d.upcomingCount}{" "}
                      upcoming
                    </p>
                    <p className="text-xs text-muted">
                      {sourceBreakdown(
                        sel.d.groovveeCount,
                        sel.d.externalCount
                      )}
                    </p>
                    <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt">
                      Click country → filtered events
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    No published events yet.
                  </p>
                )}
              </>
            )
          ) : (
            <>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
                {region.label}
              </p>
              <p className="mt-3 text-sm text-white">
                {regionTotals.published} published · {regionTotals.upcoming}{" "}
                upcoming
              </p>
              <p className="text-xs text-muted">
                {sourceBreakdown(regionTotals.g, regionTotals.e)}
              </p>
              {data.unmatchedCountryEvents > 0 && regionKey === "world" && (
                <p className="mt-3 text-xs text-muted">
                  + {data.unmatchedCountryEvents} more in locations we can&apos;t
                  map yet
                </p>
              )}
              <p className="mt-4 text-xs text-muted">
                Hover or tab through the map — click a city or shaded country to
                explore its events.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Legend + touch-friendly city list (no hover needed) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 border border-white/20 bg-volt/60" aria-hidden />
          Country heat = published events
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-volt" aria-hidden />
          City · upcoming
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-[#6b6b72]" aria-hidden />
          City · past only
        </span>
      </div>

      {cities.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Active cities in {region.label}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => go(`/events/cities/${c.slug}`)}
                className="border border-white/15 px-3 py-2 font-mono text-[11px] text-white transition-colors hover:border-volt hover:text-volt"
              >
                {c.name}
                <span className="ml-2 text-muted">
                  {c.publishedCount}·{c.upcomingCount}↑
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
