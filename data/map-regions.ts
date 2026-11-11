// Shared map configuration for the interactive events map.
// Pure data + types — safe to import from client components. The aggregated
// payload shapes live here so the server query (lib/map.ts) and the client
// map (components/events/EventsMap.tsx) share one definition.

export type MapCityDatum = {
  slug: string;
  name: string;
  stateProvince: string;
  country: string;
  countryCode: string;
  region: string;
  latitude: number;
  longitude: number;
  publishedCount: number;
  upcomingCount: number;
  groovveeCount: number;
  externalCount: number;
  nextUpcoming: {
    slug: string;
    title: string;
    startsAt: string; // ISO — serialized across the server/client boundary
    timezone: string;
  } | null;
};

export type MapCountryDatum = {
  countryCode: string;
  country: string;
  region: string;
  publishedCount: number;
  upcomingCount: number;
  groovveeCount: number;
  externalCount: number;
};

export type MapRegionDatum = {
  region: string;
  publishedCount: number;
  upcomingCount: number;
  groovveeCount: number;
  externalCount: number;
};

export type EventsMapData = {
  countries: MapCountryDatum[];
  cities: MapCityDatum[];
  regions: MapRegionDatum[];
  // Published events whose free-text country matched no known Location
  // country — kept out of the heatmap rather than guessed into a code.
  unmatchedCountryEvents: number;
};

export type MapRegionKey =
  | "world"
  | "north-america"
  | "united-states"
  | "canada"
  | "caribbean"
  | "latin-america"
  | "africa"
  | "europe"
  | "middle-east";

export type MapRegion = {
  key: MapRegionKey;
  label: string;
  // ZoomableGroup viewport: [longitude, latitude] + zoom factor (1 = world).
  center: [number, number];
  zoom: number;
  matches: (d: { countryCode: string; region: string }) => boolean;
};

const CARIBBEAN_CODES = new Set([
  "AG", "BS", "BB", "CU", "DM", "DO", "GD", "HT", "JM", "KN", "LC", "PR", "TT", "VC",
]);
const LATIN_CODES = new Set([
  "AR", "BO", "BR", "CL", "CO", "CR", "EC", "GT", "HN", "MX", "NI", "PA", "PE", "PY", "SV", "UY", "VE",
]);
const MIDDLE_EAST_CODES = new Set([
  "AE", "BH", "EG", "IL", "IQ", "IR", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE",
]);

const byRegion = (region: string, codes?: Set<string>) =>
  (d: { countryCode: string; region: string }) =>
    d.region === region || (!!codes && codes.has(d.countryCode));

export const MAP_REGIONS: MapRegion[] = [
  {
    key: "world",
    label: "World",
    center: [10, 18],
    zoom: 1,
    matches: () => true,
  },
  {
    key: "north-america",
    label: "North America",
    center: [-100, 44],
    zoom: 2.4,
    matches: (d) =>
      d.region === "North America" || d.countryCode === "MX",
  },
  {
    key: "united-states",
    label: "United States",
    center: [-97, 38],
    zoom: 3.6,
    matches: (d) => d.countryCode === "US",
  },
  {
    key: "canada",
    label: "Canada",
    center: [-98, 57],
    zoom: 3,
    matches: (d) => d.countryCode === "CA",
  },
  {
    key: "caribbean",
    label: "Caribbean",
    center: [-72, 18],
    zoom: 4.4,
    matches: byRegion("Caribbean", CARIBBEAN_CODES),
  },
  {
    key: "latin-america",
    label: "Latin America",
    center: [-66, -10],
    zoom: 2.3,
    matches: byRegion("Latin America", LATIN_CODES),
  },
  {
    key: "africa",
    label: "Africa",
    center: [18, 3],
    zoom: 2.3,
    matches: byRegion("Africa"),
  },
  {
    key: "europe",
    label: "Europe",
    center: [14, 53],
    zoom: 3.6,
    matches: byRegion("Europe"),
  },
  {
    key: "middle-east",
    label: "Middle East",
    center: [46, 27],
    zoom: 3.8,
    matches: byRegion("Middle East", MIDDLE_EAST_CODES),
  },
];

export function mapRegionByKey(key: string | undefined): MapRegion {
  return MAP_REGIONS.find((r) => r.key === key) ?? MAP_REGIONS[0];
}

// ISO 3166-1 numeric → alpha-2. world-atlas TopoJSON ids are numeric
// (zero-padded in v2); our data keys on alpha-2. Covers the seeded launch
// countries plus common Latin American / Caribbean / Middle East codes so
// external events in new markets still resolve once a Location exists.
const ISO_NUM_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "032": "AR", "051": "AM", "040": "AT", "044": "BS", "048": "BH",
  "050": "BD", "052": "BB", "056": "BE", "068": "BO", "076": "BR", "100": "BG",
  "116": "KH", "124": "CA", "152": "CL", "170": "CO", "188": "CR", "191": "HR",
  "192": "CU", "196": "CY", "203": "CZ", "208": "DK", "214": "DO", "218": "EC",
  "231": "ET", "233": "EE", "246": "FI", "250": "FR", "276": "DE", "288": "GH",
  "300": "GR", "320": "GT", "332": "HT", "340": "HN", "348": "HU", "356": "IN",
  "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL", "380": "IT",
  "388": "JM", "392": "JP", "400": "JO", "404": "KE", "414": "KW", "422": "LB",
  "428": "LV", "440": "LT", "484": "MX", "504": "MA", "512": "OM", "528": "NL",
  "554": "NZ", "566": "NG", "578": "NO", "586": "PK", "591": "PA", "600": "PY",
  "604": "PE", "608": "PH", "616": "PL", "620": "PT", "630": "PR", "634": "QA",
  "642": "RO", "643": "RU", "646": "RW", "682": "SA", "686": "SN", "688": "RS",
  "702": "SG", "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "724": "ES",
  "752": "SE", "756": "CH", "780": "TT", "784": "AE", "788": "TN", "792": "TR",
  "800": "UG", "804": "UA", "818": "EG", "826": "GB", "840": "US", "858": "UY",
  "862": "VE", "887": "YE", "894": "ZM", "716": "ZW", "558": "NI", "662": "LC",
  "659": "KN", "670": "VC", "308": "GD", "212": "DM", "028": "AG", "275": "PS",
};

export function alpha2FromNumeric(id: string | number | undefined) {
  if (id == null) return null;
  return ISO_NUM_TO_ALPHA2[String(id).padStart(3, "0")] ?? null;
}
