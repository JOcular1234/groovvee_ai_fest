import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  buildCalendarGrid,
  currentMonth,
  daysInMonth,
  eventDateKeys,
  groupEventsByDate,
  monthFetchRange,
  monthParam,
  parseMonthParam,
  shiftMonth,
} from "../lib/calendar";
import { formatEventTime, zonedDateKey } from "../lib/datetime";
import { createEvent, queryPublicEventsInRange } from "../lib/events";
import {
  queryCityBySlug,
  queryCityIndex,
  upsertLocationSeed,
} from "../lib/locations";
import { eventFormSchema } from "../lib/validation/event";
import { locationSeedSchema } from "../lib/validation/location";

// Calendar + city discovery tests. Pure date/grouping tests need no DB;
// query tests create TEST_ rows and clean them up at the end.

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
  name: "TEST_Calville",
  type: "CITY",
  stateProvince: "Calvada",
  country: "Testland",
  countryCode: "TS",
  region: "Test Region",
  latitude: 10,
  longitude: 20,
  timezone: "Africa/Lagos",
};
const EMPTY_CITY = { ...CITY, name: "TEST_Emptyton", stateProvince: "" };
const FALLBACK = {
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
  await scriptDb.location.deleteMany({ where: { name: { startsWith: "TEST_" } } });
};

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

async function main() {
  console.log("\n— Month params —");
  check(
    "parse valid month",
    parseMonthParam("2026-12")?.year === 2026 &&
      parseMonthParam("2026-12")?.month === 12
  );
  check("reject month 13", parseMonthParam("2026-13") === null);
  check("reject garbage", parseMonthParam("hello") === null);
  check("reject partial", parseMonthParam("26-12") === null);
  check("shift across year", JSON.stringify(shiftMonth({ year: 2026, month: 12 }, 1)) === JSON.stringify({ year: 2027, month: 1 }));
  check("shift backwards across year", JSON.stringify(shiftMonth({ year: 2026, month: 1 }, -1)) === JSON.stringify({ year: 2025, month: 12 }));
  check("monthParam pads", monthParam({ year: 2027, month: 3 }) === "2027-03");
  check("daysInMonth leap", daysInMonth({ year: 2028, month: 2 }) === 29);
  check("daysInMonth non-leap", daysInMonth({ year: 2027, month: 2 }) === 28);

  console.log("\n— Zoned date keys —");
  check(
    "Minneapolis Dec 4 19:00 local is Dec 5 UTC but keys to Dec 4",
    zonedDateKey(new Date("2026-12-05T01:00:00Z"), "America/Chicago") ===
      "2026-12-04"
  );
  check(
    "Lagos Nov 30 23:30 UTC is Dec 1 local",
    zonedDateKey(new Date("2026-11-30T23:30:00Z"), "Africa/Lagos") ===
      "2026-12-01"
  );
  check(
    "midnight local stays on same date",
    zonedDateKey(new Date("2026-12-04T06:00:00Z"), "Africa/Lagos") ===
      "2026-12-04"
  );
  check(
    "DST fallback (US) keeps correct date",
    zonedDateKey(new Date("2026-11-01T05:30:00Z"), "America/New_York") ===
      "2026-11-01" &&
      zonedDateKey(new Date("2026-11-01T07:30:00Z"), "America/New_York") ===
        "2026-11-01"
  );
  check(
    "formatEventTime respects timezone",
    formatEventTime(new Date("2026-12-05T01:00:00Z"), "America/Chicago") ===
      "19:00"
  );

  console.log("\n— Fetch window —");
  const win = monthFetchRange({ year: 2026, month: 12 });
  check(
    "window opens before month start",
    win.from.toISOString() === "2026-11-29T00:00:00.000Z"
  );
  check(
    "window closes after month end",
    win.to.toISOString() === "2027-01-03T00:00:00.000Z"
  );

  console.log("\n— Event date keys —");
  const single = {
    startsAt: new Date("2026-12-04T10:00:00Z"),
    endsAt: null,
    timezone: "UTC",
  };
  check("single-day event → one key", eventDateKeys(single).length === 1);
  const multi = {
    startsAt: new Date("2026-12-24T10:00:00Z"),
    endsAt: new Date("2026-12-25T10:00:00Z"),
    timezone: "UTC",
  };
  check(
    "multi-day event spans both days",
    JSON.stringify(eventDateKeys(multi)) ===
      JSON.stringify(["2026-12-24", "2026-12-25"])
  );
  const midnightEnd = {
    startsAt: new Date("2026-12-24T10:00:00Z"),
    endsAt: new Date("2026-12-25T00:00:00Z"),
    timezone: "UTC",
  };
  check(
    "event ending at local midnight does not claim that day",
    JSON.stringify(eventDateKeys(midnightEnd)) ===
      JSON.stringify(["2026-12-24"])
  );
  const crossMonth = {
    startsAt: new Date("2026-12-30T18:00:00Z"), // Dec 30 19:00 Lagos
    endsAt: new Date("2027-01-01T12:00:00Z"),
    timezone: "Africa/Lagos",
  };
  check(
    "span across month boundary",
    eventDateKeys(crossMonth).includes("2026-12-30") &&
      eventDateKeys(crossMonth).includes("2026-12-31") &&
      eventDateKeys(crossMonth).includes("2027-01-01")
  );

  console.log("\n— Month grouping —");
  const grouped = groupEventsByDate(
    [
      { ...single, startsAt: new Date("2026-12-05T01:00:00Z"), timezone: "America/Chicago" }, // local Dec 4
      { startsAt: new Date("2026-11-30T23:30:00Z"), endsAt: null, timezone: "Africa/Lagos" }, // local Dec 1
      { startsAt: new Date("2026-11-15T12:00:00Z"), endsAt: null, timezone: "UTC" }, // Nov only
    ],
    { year: 2026, month: 12 }
  );
  check(
    "UTC date differs from local date — grouped by local",
    grouped.has("2026-12-04") && !grouped.has("2026-12-05")
  );
  check(
    "Nov 30 UTC / Dec 1 local lands in December",
    grouped.has("2026-12-01")
  );
  check("out-of-month event excluded", !grouped.has("2026-11-15"));
  const twoSameDay = groupEventsByDate(
    [
      { startsAt: new Date("2026-12-04T10:00:00Z"), endsAt: null, timezone: "UTC" },
      { startsAt: new Date("2026-12-04T15:00:00Z"), endsAt: null, timezone: "UTC" },
    ],
    { year: 2026, month: 12 }
  );
  check(
    "multiple events on one date",
    twoSameDay.get("2026-12-04")?.length === 2
  );

  console.log("\n— Grid —");
  const dec = buildCalendarGrid({ year: 2026, month: 12 });
  check(
    "Dec 2026 starts Mon Nov 30 (Tue Dec 1)",
    dec[0][0].dateKey === "2026-11-30" &&
      dec[0][0].inMonth === false &&
      dec[0][1].dateKey === "2026-12-01" &&
      dec[0][1].inMonth === true
  );
  check(
    "Dec 2026 has 5 weeks, all weeks 7 days",
    dec.length === 5 && dec.every((w) => w.length === 7)
  );
  check(
    "grid covers trailing next-month days",
    dec[dec.length - 1].some(
      (c) => !c.inMonth && c.dateKey.startsWith("2027-01")
    )
  );
  const jan = buildCalendarGrid({ year: 2027, month: 1 });
  check(
    "month ending on Sunday needs no trailing cells",
    jan[jan.length - 1].every((c) => c.inMonth)
  );

  console.log("\nWarming up database…");
  await waitForDb();
  await cleanup();

  console.log("\n— City index —");
  const city = await upsertLocationSeed(scriptDb, locationSeedSchema.parse(CITY));
  const emptyCity = await upsertLocationSeed(
    scriptDb,
    locationSeedSchema.parse(EMPTY_CITY)
  );
  const fb = await upsertLocationSeed(scriptDb, locationSeedSchema.parse(FALLBACK));

  const NOW = new Date("2030-01-15T00:00:00Z");
  const eUp = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Upcoming Calville",
      locationId: city.id,
      startsAtLocal: "2030-06-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Past Calville",
      locationId: city.id,
      startsAtLocal: "2029-06-01T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Draft Calville",
      locationId: city.id,
      startsAtLocal: "2030-07-01T10:00",
      published: false,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Unpublished Emptyton",
      locationId: emptyCity.id,
      startsAtLocal: "2030-06-01T10:00",
      published: false,
    })
  );

  const index = await queryCityIndex(scriptDb, {}, NOW);
  const entry = index.cities.find((c) => c.id === city.id);
  check(
    "city with published events appears in index",
    !!entry
  );
  check(
    "published count = 2, upcoming = 1 (draft excluded)",
    entry?.publishedCount === 2 && entry.upcomingCount === 1
  );
  check(
    "city with only unpublished events excluded",
    !index.cities.some((c) => c.id === emptyCity.id)
  );
  check(
    "country fallback never listed as city",
    !index.cities.some((c) => c.id === fb.id)
  );
  check(
    "filter options derived from index",
    index.regions.includes("Test Region") && index.countries.includes("Testland")
  );

  const qHit = await queryCityIndex(scriptDb, { q: "calville" }, NOW);
  check("search filter hits city", qHit.cities.some((c) => c.id === city.id));
  const qMiss = await queryCityIndex(scriptDb, { q: "zzz-no-match" }, NOW);
  check("search filter misses cleanly", !qMiss.cities.some((c) => c.id === city.id));
  const regionHit = await queryCityIndex(scriptDb, { region: "Test Region" }, NOW);
  check("region filter works", regionHit.cities.some((c) => c.id === city.id));
  const countryMiss = await queryCityIndex(scriptDb, { country: "Nowhereland" }, NOW);
  check("country filter excludes", !countryMiss.cities.some((c) => c.id === city.id));

  console.log("\n— City by slug —");
  check(
    "CITY slug resolves",
    (await queryCityBySlug(scriptDb, city.slug))?.id === city.id
  );
  check(
    "fallback slug returns null",
    (await queryCityBySlug(scriptDb, fb.slug)) === null
  );
  check(
    "unknown slug returns null",
    (await queryCityBySlug(scriptDb, "no-such-city")) === null
  );

  console.log("\n— Range query —");
  // June 2030 window is roughly May 29 → Jul 3 (UTC, incl. TZ buffer).
  const spanIn = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Spans Into June",
      locationId: city.id,
      startsAtLocal: "2030-05-20T10:00",
      endsAtLocal: "2030-06-10T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Ended Before June",
      locationId: city.id,
      startsAtLocal: "2030-05-01T10:00",
      endsAtLocal: "2030-05-25T10:00",
      published: true,
    })
  );
  await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Instant Before June",
      locationId: city.id,
      startsAtLocal: "2030-05-15T10:00",
      published: true,
    })
  );
  const { from, to } = monthFetchRange({ year: 2030, month: 6 });
  const inRange = await queryPublicEventsInRange(scriptDb, from, to, {
    locationId: city.id,
  });
  check(
    "range query returns in-window published event (endsAt null)",
    inRange.some((e) => e.id === eUp.id)
  );
  check(
    "event starting before range but ending inside is included",
    inRange.some((e) => e.id === spanIn.id)
  );
  check(
    "event fully ended before range is excluded",
    !inRange.some((e) => e.title === "TEST_Ended Before June")
  );
  check(
    "null-endsAt event starting before range is excluded",
    !inRange.some((e) => e.title === "TEST_Instant Before June")
  );
  check(
    "range query excludes drafts",
    inRange.every((e) => e.id !== undefined) &&
      !inRange.some((e) => e.title === "TEST_Draft Calville")
  );
  const srcFiltered = await queryPublicEventsInRange(scriptDb, from, to, {
    locationId: city.id,
    source: "EXTERNAL",
  });
  check(
    "range query respects source filter",
    !srcFiltered.some((e) => e.id === eUp.id)
  );

  console.log("\n— currentMonth sanity —");
  const cm = currentMonth(new Date("2026-12-15T00:00:00Z"));
  check("currentMonth from UTC date", cm.year === 2026 && cm.month === 12);

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
