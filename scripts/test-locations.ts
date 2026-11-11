import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import { LAUNCH_LOCATIONS } from "../data/locations";
import {
  createEvent,
  deleteEvent,
  listEventsForAdmin,
  queryPublicEvents,
  updateEvent,
} from "../lib/events";
import {
  backfillEventLocations,
  eventGeoFromLocation,
  getLocationBySlug,
  listLocationsForSelect,
  locationLabel,
  locationSlug,
  upsertLocationSeed,
} from "../lib/locations";
import { eventFormSchema } from "../lib/validation/event";
import { locationSeedSchema } from "../lib/validation/location";

// DB-level test suite for the location foundation.
// Creates rows prefixed with TEST_ and removes them all at the end.

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

const CITY_SEED = {
  name: "TEST_Springfield",
  type: "CITY",
  stateProvince: "Testylina",
  country: "Testland",
  countryCode: "TS",
  region: "Test Region",
  latitude: 12.34,
  longitude: -56.78,
  timezone: "Africa/Lagos",
};

const FALLBACK_SEED = {
  name: "Testistan",
  type: "COUNTRY_FALLBACK",
  country: "Testistan",
  countryCode: "TT",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
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
  await scriptDb.location.deleteMany({
    where: { name: { startsWith: "TEST_" } },
  });
};

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

async function main() {
  console.log("Warming up database…");
  await waitForDb();
  await cleanup();

  console.log("\n— Seed validation —");
  check("valid city seed parses", locationSeedSchema.safeParse(CITY_SEED).success);
  check(
    "valid fallback seed parses",
    locationSeedSchema.safeParse(FALLBACK_SEED).success
  );
  check(
    "rejects latitude out of range",
    !locationSeedSchema.safeParse({ ...CITY_SEED, latitude: 91 }).success
  );
  check(
    "rejects longitude out of range",
    !locationSeedSchema.safeParse({ ...CITY_SEED, longitude: -181 }).success
  );
  check(
    "rejects invalid timezone",
    !locationSeedSchema.safeParse({ ...CITY_SEED, timezone: "Mars/Olympus" })
      .success
  );
  check(
    "rejects city without timezone",
    !locationSeedSchema.safeParse({ ...CITY_SEED, timezone: "" }).success
  );
  check(
    "rejects fallback with timezone",
    !locationSeedSchema.safeParse({ ...FALLBACK_SEED, timezone: "UTC" }).success
  );
  check(
    "rejects fallback whose name is not the country",
    !locationSeedSchema.safeParse({ ...FALLBACK_SEED, name: "Testburg" })
      .success
  );
  check(
    "rejects bad country code",
    !locationSeedSchema.safeParse({ ...CITY_SEED, countryCode: "USA" }).success
  );

  console.log("\n— Launch dataset —");
  const allParsed = LAUNCH_LOCATIONS.map(
    (l) => locationSeedSchema.safeParse(l).success
  );
  check(
    "every launch location validates",
    allParsed.every(Boolean),
    `${allParsed.filter((x) => !x).length} invalid`
  );
  const slugs = LAUNCH_LOCATIONS.map((l) => locationSlug(l));
  check(
    "launch slugs are unique",
    new Set(slugs).size === slugs.length
  );

  console.log("\n— Slug & label —");
  check(
    "city slug is deterministic",
    locationSlug({
      name: "Minneapolis",
      type: "CITY",
      stateProvince: "Minnesota",
      countryCode: "US",
    }) === "minneapolis-minnesota-us"
  );
  check(
    "same-named cities in different states get different slugs",
    locationSlug({
      name: "TEST_Springfield",
      type: "CITY",
      stateProvince: "North Testylina",
      countryCode: "TS",
    }) !==
      locationSlug({
        name: "TEST_Springfield",
        type: "CITY",
        stateProvince: "Testylina",
        countryCode: "TS",
      })
  );
  check(
    "fallback slug uses country prefix",
    locationSlug({
      name: "Testistan",
      type: "COUNTRY_FALLBACK",
      stateProvince: "",
      countryCode: "TT",
    }) === "country-testistan"
  );
  const cityLoc = locationSeedSchema.parse(CITY_SEED);
  const fbLoc = locationSeedSchema.parse(FALLBACK_SEED);
  check(
    "city label includes state and country",
    locationLabel(cityLoc) === "TEST_Springfield, Testylina, Testland"
  );
  check(
    "fallback label never shows country as city",
    locationLabel(fbLoc) === "Testistan (countrywide)"
  );

  console.log("\n— Geo derivation —");
  const cityGeo = eventGeoFromLocation(cityLoc);
  check(
    "city location derives city/state/country/region",
    cityGeo.city === "TEST_Springfield" &&
      cityGeo.stateProvince === "Testylina" &&
      cityGeo.country === "Testland" &&
      cityGeo.region === "Test Region"
  );
  const fbGeo = eventGeoFromLocation(fbLoc);
  check(
    "fallback location leaves city null",
    fbGeo.city === null &&
      fbGeo.stateProvince === null &&
      fbGeo.country === "Testistan"
  );

  console.log("\n— Upsert idempotency —");
  const u1 = await upsertLocationSeed(scriptDb, cityLoc);
  const u2 = await upsertLocationSeed(scriptDb, cityLoc);
  check("upsert twice keeps one row, same id", u1.id === u2.id);
  const u3 = await upsertLocationSeed(scriptDb, { ...cityLoc, latitude: 55 });
  check(
    "re-seed updates in place",
    u3.id === u1.id && u3.latitude === 55
  );
  const fb = await upsertLocationSeed(scriptDb, fbLoc);
  check(
    "fallback row stored without timezone or city state",
    fb.type === "COUNTRY_FALLBACK" && fb.timezone === null && fb.stateProvince === ""
  );
  const bySlug = await getLocationBySlug(
    scriptDb,
    locationSlug(cityLoc)
  );
  check("lookup by slug works", bySlug?.id === u1.id);
  check(
    "listLocationsForSelect returns seeded rows",
    (await listLocationsForSelect(scriptDb)).some((l) => l.id === u1.id)
  );

  console.log("\n— Event integration —");
  const eCity = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_City Event",
      locationId: u1.id,
      // Submitted text must be overridden by the location.
      city: "Wrongville",
      country: "Wrongland",
      region: "Wrong Region",
      published: true,
    })
  );
  check(
    "location overrides submitted geography",
    eCity.locationId === u1.id &&
      eCity.city === "TEST_Springfield" &&
      eCity.stateProvince === "Testylina" &&
      eCity.country === "Testland" &&
      eCity.region === "Test Region"
  );

  const eFb = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Fallback Event",
      locationId: fb.id,
      published: true,
    })
  );
  check(
    "fallback keeps city empty, sets country",
    eFb.locationId === fb.id &&
      eFb.city === null &&
      eFb.country === "Testistan"
  );

  const eOnline = await createEvent(
    scriptDb,
    eventInput({ title: "TEST_Online Event", isOnline: true, published: true })
  );
  check(
    "online event needs no location",
    eOnline.locationId === null && eOnline.city === null
  );

  let badLoc = false;
  try {
    await createEvent(
      scriptDb,
      eventInput({ title: "TEST_Bad Location", locationId: "no-such-id" })
    );
  } catch (e) {
    badLoc = e instanceof Error && e.message === "invalid_location";
  }
  check("missing location rejected", badLoc);

  const eLegacy = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Legacy Event",
      city: "Oldtown",
      country: "Oldland",
      region: "Old Region",
      published: true,
    })
  );
  const eLegacyEdited = await updateEvent(
    scriptDb,
    eLegacy.id,
    eventInput({
      title: "TEST_Legacy Event",
      city: "Oldtown",
      country: "Oldland",
      region: "Old Region",
      description: "Edited description stays manual.",
      published: true,
    })
  );
  check(
    "legacy event without location keeps text geography",
    eLegacyEdited?.locationId === null &&
      eLegacyEdited.city === "Oldtown" &&
      eLegacyEdited.region === "Old Region"
  );

  const eLinked = await updateEvent(
    scriptDb,
    eLegacy.id,
    eventInput({
      title: "TEST_Legacy Event",
      locationId: u1.id,
      published: true,
    })
  );
  check(
    "linking a location re-syncs geography",
    eLinked?.locationId === u1.id && eLinked.city === "TEST_Springfield"
  );

  console.log("\n— Filters —");
  const locFilter = await listEventsForAdmin(scriptDb, { locationId: u1.id });
  check(
    "admin location filter",
    locFilter.events.every((e) => e.locationId === u1.id) &&
      locFilter.events.some((e) => e.id === eCity.id)
  );
  const pubLoc = await queryPublicEvents(
    scriptDb,
    { locationId: u1.id },
    "upcoming",
    1,
    new Date("2030-01-15T00:00:00Z")
  );
  check(
    "public location filter",
    pubLoc.events.every((e) => e.locationId === u1.id) &&
      pubLoc.events.some((e) => e.id === eCity.id) &&
      !pubLoc.events.some((e) => e.id === eFb.id)
  );

  console.log("\n— Backfill —");
  const eBackfill = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Backfill Event",
      city: "TEST_Springfield",
      country: "Testland",
      region: "Old Region",
      published: true,
    })
  );
  const linked = await backfillEventLocations(scriptDb);
  check(
    "backfill links matching unlinked event",
    linked.some((m) => m.id === eBackfill.id)
  );
  const after = await scriptDb.event.findUnique({ where: { id: eBackfill.id } });
  check(
    "backfill re-syncs geography",
    after?.locationId === u1.id && after?.region === "Test Region"
  );
  const linkedAgain = await backfillEventLocations(scriptDb);
  check(
    "backfill is idempotent",
    !linkedAgain.some((m) => m.id === eBackfill.id)
  );

  console.log("\n— Deletion safety —");
  check("event delete works with location set", await deleteEvent(scriptDb, eCity.id));
  let restricted = false;
  try {
    await scriptDb.location.delete({ where: { id: u1.id } });
  } catch {
    restricted = true;
  }
  check(
    "location delete restricted while events reference it",
    restricted
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
