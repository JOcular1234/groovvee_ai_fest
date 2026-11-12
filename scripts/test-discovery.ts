import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  AlreadyReviewedError,
  approveCandidate,
  DISCOVERY_COOLDOWN_MS,
  DiscoveryBlockedError,
  getCandidate,
  markCandidateDuplicate,
  rejectCandidate,
  runDiscovery,
} from "../lib/discovery/service";
import { normalizeTitle, normalizeUrl } from "../lib/discovery/duplicates";
import type { EventDiscoveryProvider } from "../lib/discovery/types";
import { createEvent, queryPublicEvents } from "../lib/events";
import { upsertLocationSeed } from "../lib/locations";
import { eventFormSchema } from "../lib/validation/event";
import {
  discoveredCandidateSchema,
  discoveredEventsResponseSchema,
} from "../lib/validation/discovery";
import { locationSeedSchema } from "../lib/validation/location";

// Discovery pipeline tests — the provider is always mocked; no real API
// calls are made. Fixtures are TEST_-prefixed and cleaned up at the end.

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

const mockProvider = (
  candidates: unknown[],
  connector = "test-conn"
): EventDiscoveryProvider => ({
  name: "test-provider",
  model: "test-model",
  connector,
  discover: async () => ({ candidates }),
});

const failingProvider = (): EventDiscoveryProvider => ({
  name: "test-provider",
  model: "test-model",
  connector: "test-conn",
  discover: async () => {
    throw new Error("provider exploded");
  },
});

const CITY = {
  name: "TEST_Discville",
  type: "CITY",
  stateProvince: "Discovia",
  country: "Discland",
  countryCode: "DI",
  region: "Test Region",
  latitude: 1,
  longitude: 2,
  timezone: "UTC",
};

const baseCandidate = {
  title: "TEST_Discovered AI Summit",
  description: "A real AI summit description.",
  startDate: "2030-06-15T10:00",
  endDate: "2030-06-16T18:00",
  timezone: "UTC",
  venueName: "Disc Hall",
  city: "TEST_Discville",
  stateProvince: "Discovia",
  country: "Discland",
  registrationUrl: "https://register.example.com/summit",
  sourceUrl: "https://events.example.com/summit-2030",
  imageUrl: "https://cdn.example.com/img.png",
  category: "conference",
  externalId: "ext-summit-1",
  confidence: "high",
  evidence: "The official page lists June 15–16 2030.",
  missingFields: [] as string[],
};

const runInput = {
  region: "Test Region",
  country: undefined,
  city: undefined,
  categories: ["conference"],
  dateFrom: "2030-01-01",
  dateTo: "2030-12-31",
  maxResults: 10,
};

function rawEventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "TEST Approved Event",
    slug: "",
    description: "Approved event description.",
    source: "EXTERNAL",
    externalId: "",
    startsAtLocal: "2030-06-15T10:00",
    endsAtLocal: "2030-06-16T18:00",
    timezone: "UTC",
    city: "",
    stateProvince: "",
    country: "",
    region: "",
    venueName: "Disc Hall",
    isOnline: false,
    url: "https://register.example.com/summit",
    imageUrl: "",
    locationId: "",
    communityId: "",
    featured: false,
    published: true,
    sortOrder: 0,
    ...overrides,
  };
}
function eventInput(overrides: Record<string, unknown> = {}) {
  const parsed = eventFormSchema.safeParse(rawEventInput(overrides));
  if (!parsed.success)
    throw new Error(
      `fixture failed to parse: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  return parsed.data;
}

async function seedAdmin(): Promise<string> {
  const existing = await scriptDb.admin.findFirst({ select: { id: true } });
  if (existing) return existing.id;
  const a = await scriptDb.admin.create({
    data: {
      name: "TEST_Admin",
      email: "test-admin@test.local",
      passwordHash: "x",
      role: "ADMIN",
      isActive: true,
    },
  });
  return a.id;
}

const cleanup = async () => {
  await scriptDb.discoveredEvent.deleteMany({
    where: { title: { startsWith: "TEST_" } },
  });
  await scriptDb.discoveryRun.deleteMany({
    where: { provider: "test-provider" },
  });
  await scriptDb.event.deleteMany({ where: { title: { startsWith: "TEST_" } } });
  await scriptDb.location.deleteMany({ where: { name: { startsWith: "TEST_" } } });
  await scriptDb.admin.deleteMany({ where: { email: "test-admin@test.local" } });
};

const TRANSIENT = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENETUNREACH",
]);

async function main() {
  console.log("\n— Schema validation —");
  check("valid candidate parses", discoveredCandidateSchema.safeParse(baseCandidate).success);
  check("missing sourceUrl rejected", !discoveredCandidateSchema.safeParse({ ...baseCandidate, sourceUrl: "" }).success);
  check("javascript: sourceUrl rejected", !discoveredCandidateSchema.safeParse({ ...baseCandidate, sourceUrl: "javascript:alert(1)" }).success);
  check("bad timezone rejected", !discoveredCandidateSchema.safeParse({ ...baseCandidate, timezone: "Mars/Olympus" }).success);
  check("null timezone accepted", discoveredCandidateSchema.safeParse({ ...baseCandidate, timezone: null }).success);
  check("null startDate accepted", discoveredCandidateSchema.safeParse({ ...baseCandidate, startDate: null }).success);
  check("response envelope validates", discoveredEventsResponseSchema.safeParse({ events: [baseCandidate] }).success);

  console.log("\n— Normalization —");
  check(
    "normalizeUrl strips tracking params + protocol",
    normalizeUrl("https://www.Example.com/e/123?utm_source=x&b=2&a=1#frag") ===
      "www.example.com/e/123?a=1&b=2"
  );
  check(
    "normalizeUrl keeps meaningful params",
    normalizeUrl("https://e.com/ev?id=42") === "e.com/ev?id=42"
  );
  check(
    "normalizeTitle folds case + punctuation",
    normalizeTitle("AI Summit — Lagos 2030!") === "ai summit lagos 2030"
  );

  console.log("\nWarming up database…");
  await waitForDb();
  await cleanup();

  const adminId = await seedAdmin();
  const city = await upsertLocationSeed(scriptDb, locationSeedSchema.parse(CITY));

  console.log("\n— Run orchestration —");
  const r1 = await runDiscovery(scriptDb, adminId, runInput, mockProvider([baseCandidate]));
  check("run inserts candidate", r1.inserted === 1 && r1.found === 1);
  const run1 = await scriptDb.discoveryRun.findUnique({ where: { id: r1.runId } });
  check("run status COMPLETED", run1?.status === "COMPLETED");
  check(
    "run records provider/model/params",
    run1?.provider === "test-provider" && run1?.model === "test-model"
  );

  const c1 = await scriptDb.discoveredEvent.findFirst({
    where: { title: "TEST_Discovered AI Summit" },
  });
  check("candidate is PENDING", c1?.status === "PENDING");
  check("city text resolved to CITY location", c1?.locationId === city.id);
  check(
    "sourceUrl preserved + normalized",
    c1?.sourceUrl === baseCandidate.sourceUrl &&
      c1?.sourceUrlNormalized === "events.example.com/summit-2030"
  );
  check(
    "start resolved in timezone to UTC instant",
    c1?.startsAt?.toISOString() === "2030-06-15T10:00:00.000Z"
  );

  console.log("\n— Concurrency + rate limiting —");
  let blocked = false;
  try {
    await runDiscovery(scriptDb, adminId, runInput, mockProvider([]));
  } catch (e) {
    blocked = e instanceof DiscoveryBlockedError;
  }
  check("cooldown blocks immediate re-run", blocked);

  await scriptDb.discoveryRun.create({
    data: {
      adminId,
      provider: "test-provider",
      model: "test-model",
      params: {},
      status: "RUNNING",
    },
  });
  await scriptDb.discoveryRun.updateMany({
    where: { provider: "test-provider", status: "COMPLETED" },
    data: { startedAt: new Date(Date.now() - DISCOVERY_COOLDOWN_MS - 1000) },
  });
  blocked = false;
  try {
    await runDiscovery(scriptDb, adminId, runInput, mockProvider([]));
  } catch (e) {
    blocked = e instanceof DiscoveryBlockedError && /already in progress/i.test(e.message);
  }
  check("concurrent RUNNING run blocks new run", blocked);
  await scriptDb.discoveryRun.deleteMany({
    where: { provider: "test-provider", status: "RUNNING" },
  });

  console.log("\n— Provider failure —");
  let failedRun = false;
  try {
    await runDiscovery(scriptDb, adminId, runInput, failingProvider());
  } catch {
    failedRun = true;
  }
  check("provider error propagates", failedRun);
  const failedRow = await scriptDb.discoveryRun.findFirst({
    where: { provider: "test-provider", status: "FAILED" },
    orderBy: { startedAt: "desc" },
  });
  check(
    "failed run recorded with error summary",
    !!failedRow && !!failedRow.error && failedRow.status === "FAILED"
  );
  await scriptDb.discoveryRun.updateMany({
    where: { provider: "test-provider" },
    data: { startedAt: new Date(Date.now() - DISCOVERY_COOLDOWN_MS - 1000) },
  });

  console.log("\n— Exact duplicates —");
  // Same source URL as c1 (normalized), different title → flagged EXACT.
  const r2 = await runDiscovery(
    scriptDb,
    adminId,
    runInput,
    mockProvider([
      {
        ...baseCandidate,
        title: "TEST_Duplicate Summit Copy",
        externalId: "different-id",
        sourceUrl: "https://events.example.com/summit-2030/?utm_source=nl",
      },
      {
        ...baseCandidate,
        title: "TEST_Same External ID",
        externalId: "ext-summit-1",
        sourceUrl: "https://other.example.com/x",
      },
      { garbage: true },
    ])
  );
  check("invalid candidate counted", r2.invalid === 1);
  const sameId = await scriptDb.discoveredEvent.findFirst({
    where: { title: "TEST_Same External ID" },
  });
  check(
    "same connector+externalId not re-inserted",
    sameId === null,
    sameId ? "row exists" : ""
  );
  const dupeCopy = await scriptDb.discoveredEvent.findFirst({
    where: { title: "TEST_Duplicate Summit Copy" },
  });
  check(
    "normalized source URL match not re-inserted",
    dupeCopy === null,
    dupeCopy ? "row exists" : ""
  );
  check("duplicates counted on run", (r2.dupes ?? 0) >= 2);
  const run2 = await scriptDb.discoveryRun.findUnique({ where: { id: r2.runId } });
  check("mixed run marked PARTIAL", run2?.status === "PARTIAL");
  await scriptDb.discoveryRun.updateMany({
    where: { provider: "test-provider" },
    data: { startedAt: new Date(Date.now() - DISCOVERY_COOLDOWN_MS - 1000) },
  });

  console.log("\n— Fuzzy duplicates —");
  // Existing public event with same title → fuzzy flag for review.
  // (registrationUrl differs so this exercises fuzzy, not exact, matching.)
  const existing = await createEvent(
    scriptDb,
    eventInput({ title: "TEST_Discovered AI Summit 2030", startsAtLocal: "2030-06-15T10:00" })
  );
  await runDiscovery(
    scriptDb,
    adminId,
    runInput,
    mockProvider([
      {
        ...baseCandidate,
        title: "TEST_Discovered AI Summit 2030",
        externalId: "ext-other",
        sourceUrl: "https://different.example.com/abc",
        registrationUrl: null,
      },
    ])
  );
  const fuzzy = await scriptDb.discoveredEvent.findFirst({
    where: { title: "TEST_Discovered AI Summit 2030" },
  });
  check(
    "fuzzy match flags existing event",
    fuzzy?.duplicateOfEventId === existing.id && fuzzy?.duplicateKind === "FUZZY"
  );
  check("fuzzy candidate still PENDING (never auto-merged)", fuzzy?.status === "PENDING");

  console.log("\n— Approval —");
  const approveInput = eventInput({ locationId: city.id, externalId: "" });
  const ev = await approveCandidate(scriptDb, c1!.id, adminId, approveInput, "looks good");
  check("approved event created published+EXTERNAL", ev.published && ev.source === "EXTERNAL");
  check(
    "externalId preserved from candidate",
    ev.externalId === baseCandidate.externalId
  );
  check("registration URL mapped to event.url", ev.url === baseCandidate.registrationUrl);
  const after = await scriptDb.discoveredEvent.findUnique({ where: { id: c1!.id } });
  check(
    "candidate APPROVED + linked to event + reviewer recorded",
    after?.status === "APPROVED" &&
      after.approvedEventId === ev.id &&
      after.reviewerAdminId === adminId &&
      after.reviewedAt !== null
  );

  let doubleApproved = false;
  try {
    await approveCandidate(scriptDb, c1!.id, adminId, approveInput);
  } catch (e) {
    doubleApproved = e instanceof AlreadyReviewedError;
  }
  check("double approval prevented", doubleApproved);
  const eventCount = await scriptDb.event.count({
    where: { title: "TEST Approved Event" },
  });
  check("only one event created from candidate", eventCount === 1);

  await scriptDb.discoveryRun.updateMany({
    where: { provider: "test-provider" },
    data: { startedAt: new Date(Date.now() - DISCOVERY_COOLDOWN_MS - 1000) },
  });

  console.log("\n— Approval failure rolls back —");
  await runDiscovery(
    scriptDb,
    adminId,
    runInput,
    mockProvider([{ ...baseCandidate, title: "TEST_Rollback Event", externalId: "rb-1", sourceUrl: "https://rb.example.com/e" }])
  );
  const rb = await scriptDb.discoveredEvent.findFirst({ where: { title: "TEST_Rollback Event" } });
  let rolledBack = false;
  try {
    await approveCandidate(
      scriptDb,
      rb!.id,
      adminId,
      eventInput({ locationId: "no-such-location" })
    );
  } catch (e) {
    rolledBack = (e as Error).message === "invalid_location";
  }
  const rbAfter = await scriptDb.discoveredEvent.findUnique({ where: { id: rb!.id } });
  check(
    "failed approval leaves candidate PENDING",
    rolledBack && rbAfter?.status === "PENDING" && rbAfter.approvedEventId === null
  );
  await scriptDb.discoveryRun.updateMany({
    where: { provider: "test-provider" },
    data: { startedAt: new Date(Date.now() - DISCOVERY_COOLDOWN_MS - 1000) },
  });

  console.log("\n— Reject + duplicate marking —");
  await rejectCandidate(scriptDb, rb!.id, adminId, "not real");
  const rejected = await scriptDb.discoveredEvent.findUnique({ where: { id: rb!.id } });
  check(
    "reject records status + reviewer + notes",
    rejected?.status === "REJECTED" &&
      rejected.reviewerAdminId === adminId &&
      rejected.reviewNotes === "not real"
  );

  await runDiscovery(
    scriptDb,
    adminId,
    runInput,
    mockProvider([{ ...baseCandidate, title: "TEST_Mark Dup", externalId: "md-1", sourceUrl: "https://md.example.com/e" }])
  );
  const md = await scriptDb.discoveredEvent.findFirst({ where: { title: "TEST_Mark Dup" } });
  await markCandidateDuplicate(scriptDb, md!.id, adminId, existing.id, "same event");
  const mdAfter = await scriptDb.discoveredEvent.findUnique({ where: { id: md!.id } });
  check(
    "duplicate marking links event + reviewer",
    mdAfter?.status === "DUPLICATE" &&
      mdAfter.duplicateOfEventId === existing.id &&
      mdAfter.reviewerAdminId === adminId
  );

  console.log("\n— Review detail query —");
  const detail = await getCandidate(scriptDb, fuzzy!.id);
  check(
    "candidate detail resolves linked event dupe",
    detail?.duplicateOfEvent?.id === existing.id
  );
  check("unknown candidate returns null", (await getCandidate(scriptDb, "missing")) === null);

  console.log("\n— Public isolation —");
  // Unapproved candidates (PENDING/REJECTED/DUPLICATE) must not have
  // produced Event rows at all — let alone public ones.
  const candidateTitleEvents = await scriptDb.event.findMany({
    where: {
      title: {
        in: [
          "TEST_Rollback Event",
          "TEST_Mark Dup",
          "TEST_Same External ID",
          "TEST_Duplicate Summit Copy",
        ],
      },
    },
    select: { id: true },
  });
  check(
    "unapproved candidates produced no Event rows",
    candidateTitleEvents.length === 0,
    `${candidateTitleEvents.length} rows found`
  );
  // The pending fuzzy candidate shares a title with the pre-existing event —
  // exactly one Event should exist (the real one), not a second.
  const fuzzyTitleCount = await scriptDb.event.count({
    where: { title: "TEST_Discovered AI Summit 2030" },
  });
  check("no event row created from pending fuzzy candidate", fuzzyTitleCount === 1);
  check(
    "approved event IS public",
    (await queryPublicEvents(scriptDb, { q: "TEST Approved Event" }, "upcoming", 1)).events.length === 1
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
