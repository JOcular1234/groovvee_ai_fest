import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import { zonedToUtc } from "../lib/datetime";
import {
  createEvent,
  deleteEvent,
  getEventById,
  listEventsForAdmin,
  moveEvent,
  queryEventBySlug,
  queryFeaturedEvents,
  queryFeaturedOrNextEvent,
  queryPublicEvents,
  queryPublishedEvents,
  queryRelatedEvents,
  setEventFeatured,
  setEventPublished,
  updateEvent,
} from "../lib/events";
import { SlugConflictError } from "../lib/slug";
import { eventFormSchema } from "../lib/validation/event";

// DB-level test suite for event management.
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
    country: "",
    region: "",
    venueName: "",
    isOnline: false,
    url: "",
    imageUrl: "",
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
  await scriptDb.agendaItem.deleteMany({
    where: { title: { startsWith: "TEST_" } },
  });
  await scriptDb.community.deleteMany({
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

  console.log("\n— Timezone —");
  const lagos = zonedToUtc("2030-06-01T10:00", "Africa/Lagos");
  check(
    "wall time converts to UTC instant",
    lagos?.toISOString() === "2030-06-01T09:00:00.000Z"
  );
  check("invalid wall time rejected", zonedToUtc("not-a-date", "UTC") === null);
  check("invalid timezone rejected", zonedToUtc("2030-06-01T10:00", "Mars/Olympus") === null);

  console.log("\n— Validation —");
  check(
    "rejects empty title",
    !eventFormSchema.safeParse(rawEventInput({ title: "" })).success
  );
  check(
    "rejects short description",
    !eventFormSchema.safeParse(rawEventInput({ description: "short" })).success
  );
  check(
    "rejects end before start",
    !eventFormSchema.safeParse(
      rawEventInput({ startsAtLocal: "2030-06-01T12:00", endsAtLocal: "2030-06-01T10:00" })
    ).success
  );
  check(
    "accepts end after start",
    eventFormSchema.safeParse(
      rawEventInput({ startsAtLocal: "2030-06-01T10:00", endsAtLocal: "2030-06-01T12:00" })
    ).success
  );
  check(
    "rejects invalid timezone",
    !eventFormSchema.safeParse(rawEventInput({ timezone: "Mars/Olympus" })).success
  );
  check(
    "rejects bad url",
    !eventFormSchema.safeParse(rawEventInput({ url: "http://insecure.test" })).success
  );
  check(
    "rejects malformed datetime",
    !eventFormSchema.safeParse(rawEventInput({ startsAtLocal: "June 1 2030" })).success
  );

  console.log("\n— Slug & CRUD —");
  const e1 = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Lagos Meetup",
      published: true,
      timezone: "Africa/Lagos",
      city: "Lagos",
      country: "Nigeria",
    })
  );
  check("auto slug generated", e1.slug === "test-lagos-meetup");
  check(
    "startsAt stored as UTC instant",
    e1.startsAt.toISOString() === "2030-06-01T09:00:00.000Z"
  );

  const e2 = await createEvent(
    scriptDb,
    eventInput({ title: "TEST_Lagos Meetup" })
  );
  check("auto collision gets suffix", e2.slug === "test-lagos-meetup-2");

  let dup = false;
  try {
    await createEvent(
      scriptDb,
      eventInput({ title: "TEST_Other", slug: e1.slug })
    );
  } catch (e) {
    dup = e instanceof SlugConflictError;
  }
  check("manual duplicate slug rejected", dup);

  const updated = await updateEvent(scriptDb, e1.id, {
    ...eventInput({
      title: "TEST_Lagos Meetup",
      city: "Abuja",
      published: true, // keep published for later visibility checks
    }),
    slug: e1.slug,
  });
  check(
    "update keeps slug, sets fields",
    updated?.slug === e1.slug && updated.city === "Abuja"
  );
  check(
    "update of missing event returns null",
    (await updateEvent(scriptDb, "missing", eventInput())) === null
  );

  console.log("\n— Community association —");
  const comm = await scriptDb.community.create({
    data: {
      name: "TEST_Host Community",
      slug: "test-host-community",
      type: "CAMPUS",
      description: "test",
    },
  });
  const e3 = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Community Event",
      communityId: comm.id,
      published: true,
      featured: true,
    })
  );
  check("event linked to community", e3.communityId === comm.id);

  let badComm = false;
  try {
    await createEvent(
      scriptDb,
      eventInput({ title: "TEST_Bad Community", communityId: "no-such-id" })
    );
  } catch (e) {
    badComm = e instanceof Error && e.message === "invalid_community";
  }
  check("missing community rejected", badComm);

  console.log("\n— Publish / feature / public —");
  let publicList = await queryPublishedEvents(scriptDb);
  check(
    "unpublished event hidden publicly",
    !publicList.some((e) => e.id === e2.id) &&
      publicList.some((e) => e.id === e1.id)
  );

  await setEventPublished(scriptDb, e2.id, true);
  publicList = await queryPublishedEvents(scriptDb);
  check(
    "publish makes event public",
    publicList.some((e) => e.id === e2.id)
  );
  await setEventPublished(scriptDb, e2.id, false);
  check(
    "unpublish removes event publicly",
    !(await queryPublishedEvents(scriptDb)).some((e) => e.id === e2.id)
  );

  const featured = await queryFeaturedEvents(scriptDb);
  check(
    "featured list = published AND featured",
    featured.some((e) => e.id === e3.id) && !featured.some((e) => e.id === e1.id)
  );
  await setEventFeatured(scriptDb, e1.id, true);
  check(
    "feature toggle works",
    (await queryFeaturedEvents(scriptDb)).some((e) => e.id === e1.id)
  );

  const bySlug = await queryEventBySlug(scriptDb, e3.slug);
  check("slug page returns published event", bySlug?.id === e3.id);
  check(
    "slug page excludes unpublished",
    (await queryEventBySlug(scriptDb, e2.slug)) === null
  );

  console.log("\n— Filters, ordering, delete —");
  const regionFilter = await listEventsForAdmin(scriptDb, {
    q: "TEST_",
    region: "West Africa",
  });
  const withRegion = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Regional",
      region: "West Africa",
      published: true,
    })
  );
  const regionFilter2 = await listEventsForAdmin(scriptDb, {
    q: "TEST_",
    region: "West Africa",
  });
  check(
    "region filter works",
    regionFilter2.events.length === regionFilter.events.length + 1 &&
      regionFilter2.events.some((e) => e.id === withRegion.id)
  );

  const search = await listEventsForAdmin(scriptDb, { q: "TEST_Regional" });
  check(
    "admin search by title",
    search.events.length === 1 && search.events[0].id === withRegion.id
  );
  const draftOnly = await listEventsForAdmin(scriptDb, {
    q: "TEST_",
    status: "draft",
  });
  check(
    "status filter hides published",
    draftOnly.events.every((e) => !e.published)
  );

  const adminOrder = async () =>
    (
      await scriptDb.event.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((e) => e.id);
  const ordered = await adminOrder();
  const idx = ordered.indexOf(e3.id);
  const neighbor = ordered[idx - 1];
  check("moveEvent swaps", await moveEvent(scriptDb, e3.id, -1));
  const after = await adminOrder();
  check(
    "order changed correctly",
    after[idx - 1] === e3.id && after[idx] === neighbor
  );

  // Agenda items linked to an event must survive its deletion (SetNull).
  const agenda = await scriptDb.agendaItem.create({
    data: {
      title: "TEST_Agenda",
      description: "test",
      startsAt: new Date("2030-06-01T10:00:00Z"),
      endsAt: new Date("2030-06-01T11:00:00Z"),
      eventId: e1.id,
    },
  });
  check("deleteEvent returns true", await deleteEvent(scriptDb, e1.id));
  const agendaAfter = await scriptDb.agendaItem.findUnique({
    where: { id: agenda.id },
  });
  check(
    "deleting event keeps agenda item, clears link",
    !!agendaAfter && agendaAfter.eventId === null
  );
  check("deleted event gone", (await getEventById(scriptDb, e1.id)) === null);
  check(
    "delete of missing event returns false",
    (await deleteEvent(scriptDb, e1.id)) === false
  );

  console.log("\n— Public directory —");
  const NOW = new Date("2030-01-15T00:00:00Z");
  const future = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Future Gala",
      startsAtLocal: "2030-03-01T10:00",
      region: "East Africa",
      country: "Kenya",
      published: true,
    })
  );
  const past = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Past Summit",
      startsAtLocal: "2029-03-01T10:00",
      published: true,
    })
  );

  const upcoming = await queryPublicEvents(scriptDb, {}, "upcoming", 1, NOW);
  const pastList = await queryPublicEvents(scriptDb, {}, "past", 1, NOW);
  check(
    "upcoming excludes past events",
    upcoming.events.some((e) => e.id === future.id) &&
      !upcoming.events.some((e) => e.id === past.id)
  );
  check(
    "past excludes upcoming events",
    pastList.events.some((e) => e.id === past.id) &&
      !pastList.events.some((e) => e.id === future.id)
  );

  const titleSearch = await queryPublicEvents(
    scriptDb,
    { q: "Future Gala" },
    "upcoming",
    1,
    NOW
  );
  check(
    "public search by title",
    titleSearch.events.some((e) => e.id === future.id)
  );
  const regionQ = await queryPublicEvents(
    scriptDb,
    { region: "East Africa" },
    "upcoming",
    1,
    NOW
  );
  check(
    "region filter",
    regionQ.events.some((e) => e.id === future.id) &&
      regionQ.events.every((e) => e.region === "East Africa")
  );
  const countryQ = await queryPublicEvents(
    scriptDb,
    { country: "Kenya" },
    "upcoming",
    1,
    NOW
  );
  check(
    "country filter",
    countryQ.events.some((e) => e.id === future.id)
  );

  // Featured-or-next: featured upcoming wins; without one, next upcoming is used.
  const fallback = await queryFeaturedOrNextEvent(scriptDb, NOW);
  check(
    "hero falls back to next upcoming",
    !!fallback && fallback.startsAt >= NOW
  );
  await setEventFeatured(scriptDb, e3.id, true); // e3: 2030-06-01, published
  await setEventFeatured(scriptDb, future.id, true); // 2030-03-01, earlier
  const heroPick = await queryFeaturedOrNextEvent(scriptDb, NOW);
  check(
    "hero prefers featured upcoming",
    heroPick?.id === future.id
  );

  // Related: same-community events preferred, then other upcoming.
  const e3b = await createEvent(
    scriptDb,
    eventInput({
      title: "TEST_Community Event 2",
      communityId: comm.id,
      startsAtLocal: "2030-07-01T10:00",
      published: true,
    })
  );
  const rel = await queryRelatedEvents(
    scriptDb,
    { id: e3.id, communityId: comm.id },
    3,
    NOW
  );
  check(
    "related prefers same community",
    rel.length > 0 && rel[0].id === e3b.id
  );
  check(
    "related excludes the event itself",
    !rel.some((e) => e.id === e3.id)
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
