"use client";

import dynamic from "next/dynamic";

import type { EventsMapData, MapRegionKey } from "@/data/map-regions";

// The map pulls in react-simple-maps + TopoJSON — keep it out of the main
// /events bundle and render it client-side only (SVG map has no SSR value).
const EventsMap = dynamic(() => import("./EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="mt-8 border border-white/10 bg-panel p-12 text-center">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
        Loading map…
      </p>
    </div>
  ),
});

export function EventsMapLazy({
  data,
  initialRegion,
}: {
  data: EventsMapData;
  initialRegion?: MapRegionKey;
}) {
  return <EventsMap data={data} initialRegion={initialRegion} />;
}
