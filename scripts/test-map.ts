import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  alpha2FromNumeric,
  MAP_REGIONS,
  mapRegionByKey,
} from "../data/map-regions";
import { createEvent } from "../lib/events";
import { queryEventsMapData } from "../lib/map";
import { upsertLocationSeed } from "../lib/locations";
import { eventFormSchema } from "../lib/validation/event";
import { locationSeedSchema } from "../lib/validation/location";

// Map aggregation tests: country/region/city counts, source splits, next
// upcoming, fallback exclusion, legacy text-country resolution.
// All fixtures are TEST_-prefixed and cleaned up at the end.

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const CITY = {
  name: "TEST_Mapville",
  type: "CITY",
  stateProvince: "Mappin",
  country: "Mapland",
  countryCode: "MP",
  region: "Test Region",
  latitude: 12,
  longitude: 34,
  timezone: "Africa/Lagos",
};
const FALLBACK = {
  name: "Mapistan",
  type: "COUNTRY_FALLBACK",
  country: "Mapistan",
  countryCode: "MQ",
  region: "Fallback Region",
  latitude: 5,
  longitude: 6,
};

function rawEventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "TEST Event",
    slug: "",
    description: "Test event description.",
    source: "GROOVVEE",
    externalId: "",
    startsAtLocal: "2030-06-01T10:00",
    endsAtLocal: "",
    timezone: "UTC",
    city: "",
    stateProvince: "",
    country: "",
    region: "",
    venueName: "",
    isOnline: false,
    url: "",
    imageUrl: "",
    locationId: "",
    communityId: "",
    featured: false,
    published: false,
    sortOrder: 0,
    ...overrides,
  };
}
function eventInput(overrides: Record<string, unknown> = {}) {
  const parsed = eventFormSchema.safeParse(rawEventInput(overrides));
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.event.deleteMany({ where: { title: { startsWith: "TEST_" } } });
  await scriptDb.location.deleteMany({ where: { name: { startsWith: "TEST_" } } });
};

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

const NOW = new Date("2030-01-15T00:00:00Z");

async function main() {
  console.log("\n— Region config (pure) —");
  check("world region matches everything", mapRegionByKey("world").matches({ countryCode: "XX", region: "Anything" }));
  check("unknown key falls back to world", mapRegionByKey("nope").key === "world");
  check(
    "africa region matches Africa + excludes Europe",
    mapRegionByKey("africa").matches({ countryCode: "NG", region: "Africa" }) &&
      !mapRegionByKey("africa").matches({ countryCode: "DE", region: "Europe" })
  );
  check(
    "caribbean matches code list even for other region labels",
    mapRegionByKey("caribbean").matches({ countryCode: "DO", region: "Latin America" })
  );
  check("every region has a viewport", MAP_REGIONS.every((r) => r.zoom >= 1 && r.center.length === 2));
  check(
    "numeric ids resolve to alpha-2",
    alpha2FromNumeric("840") === "US" &&
      alpha2FromNumeric(76) === "BR" &&
      alpha2FromNumeric("566") === "NG"
  );
  check("unknown numeric id → null", alpha2FromNumeric("999") === null);

  console.log("\nWarming up database…");
  await waitForDb();
  await cleanup();

  const city = await upsertLocationSeed(scriptDb, locationSeedSchema.parse(CITY));
  const fb = await upsertLocationSeed(scriptDb, locationSeedSchema.parse(FALLBACK));

  const evG = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Map Upcoming GrooVVee",
      locationId: city.id,
      startsAtLocal: "2030-06-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Map Upcoming External",
      locationId: city.id,
      source: "EXTERNAL",
      externalId: "ext-1",
      startsAtLocal: "2030-07-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Map Past",
      locationId: city.id,
      startsAtLocal: "2029-06-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Map Draft",
      locationId: city.id,
      startsAtLocal: "2030-05-01T10:00",
      published: false,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Map Fallback Country",
      locationId: fb.id,
      startsAtLocal: "2030-08-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Legacy Mapland",
      country: "Mapland",
      region: "Test Region",
      startsAtLocal: "2030-09-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Legacy Nowhere",
      country: "No Match Land",
      region: "Nowhere Region",
      source: "EXTERNAL",
      externalId: "ext-2",
      startsAtLocal: "2030-10-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Online No Geo",
      isOnline: true,
      published: true,
    })
  );

  const data = await queryEventsMapData(scriptDb, NOW);

  console.log("\n— Country aggregation —");
  const mp = data.countries.find((c) => c.countryCode === "MP");
  check(
    "linked + legacy-matched events share one country bucket",
    mp?.publishedCount === 4
  );
  check(
    "country upcoming count (excludes past + drafts)",
    mp?.upcomingCount === 3
  );
  check(
    "country source split",
    mp?.groovveeCount === 3 && mp?.externalCount === 1
  );
  const mq = data.countries.find((c) => c.countryCode === "MQ");
  check(
    "fallback-linked events count toward their country",
    mq?.publishedCount === 1 && mq?.upcomingCount === 1
  );
  check(
    "unmatched legacy country contributes no country bucket",
    !data.countries.some((c) => c.country === "No Match Land")
  );
  check(
    "unmatched counted separately",
    data.unmatchedCountryEvents === 1
  );
  check(
    "online event with no country not counted as unmatched",
    data.unmatchedCountryEvents === 1
  );

  console.log("\n— Region aggregation —");
  const tr = data.regions.find((r) => r.region === "Test Region");
  check(
    "region merges linked + legacy text regions",
    tr?.publishedCount === 4 && tr?.upcomingCount === 3
  );
  check(
    "region source split",
    tr?.groovveeCount === 3 && tr?.externalCount === 1
  );
  const freg = data.regions.find((r) => r.region === "Fallback Region");
  check("fallback region counted", freg?.publishedCount === 1);
  const nw = data.regions.find((r) => r.region === "Nowhere Region");
  check(
    "legacy-only region still aggregated",
    nw?.publishedCount === 1 && nw?.externalCount === 1
  );

  console.log("\n— City markers —");
  const testCities = data.cities.filter((c) => c.name.startsWith("TEST_"));
  check(
    "only cities with published events appear",
    testCities.length === 1 && testCities[0].name === "TEST_Mapville"
  );
  const mv = testCities[0];
  check(
    "city counts exclude drafts, split past/upcoming",
    mv.publishedCount === 3 && mv.upcomingCount === 2
  );
  check(
    "city source split",
    mv.groovveeCount === 2 && mv.externalCount === 1
  );
  check(
    "fallback location never becomes a marker",
    !data.cities.some((c) => c.slug === fb.slug)
  );
  check(
    "marker uses stored coordinates",
    mv.latitude === 12 && mv.longitude === 34
  );
  check(
    "marker destination is the city page slug",
    mv.slug === city.slug
  );
  check(
    "next upcoming = earliest upcoming event",
    mv.nextUpcoming?.slug === evG.slug
  );

  console.log("\n— No double counting —");
  check(
    "country total = linked city events + exactly one legacy match",
    mp!.publishedCount - mv.publishedCount === 1
  );
  check(
    "city markers are unique per location slug",
    new Set(data.cities.map((c) => c.slug)).size === data.cities.length
  );
  check(
    "country buckets are unique per code",
    new Set(data.countries.map((c) => c.countryCode)).size ===
      data.countries.length
  );

  await cleanup();
  await closeScriptDb();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

let attempt = 0;
async function run(): Promise<void> {
  try {
    await main();
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? "");
    if (TRANSIENT.has(code) && ++attempt <= 3) {
      console.log(`Transient ${code} — restarting suite (attempt ${attempt})`);
      return run();
    }
    console.error("Suite error:", err);
    await cleanup().catch(() => {});
    await closeScriptDb().catch(() => {});
    process.exit(1);
  }
}

run();
