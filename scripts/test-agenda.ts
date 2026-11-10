import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  createAgendaItem,
  deleteAgendaItem,
  getAgendaItemById,
  listAgendaForAdmin,
  moveAgendaItem,
  queryEventProgramme,
  setAgendaPublished,
  updateAgendaItem,
} from "../lib/agenda";
import { agendaInputSchema } from "../lib/validation/agenda";

// DB-level test suite for agenda/session management + event integration.
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

function rawAgendaInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "TEST Session",
    description: "Test session description.",
    type: "TALK",
    startsAtLocal: "2030-06-01T10:00",
    endsAtLocal: "2030-06-01T11:00",
    location: "",
    eventId: "",
    speakerIds: [] as string[],
    published: false,
    sortOrder: 0,
    ...overrides,
  };
}

function agendaInput(overrides: Record<string, unknown> = {}) {
  const parsed = agendaInputSchema.safeParse(rawAgendaInput(overrides));
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.agendaItem.deleteMany({
    where: { title: { startsWith: "TEST_" } },
  });
  await scriptDb.event.deleteMany({ where: { title: { startsWith: "TEST_" } } });
  await scriptDb.speaker.deleteMany({
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

  console.log("\n— Validation —");
  check(
    "rejects empty title",
    !agendaInputSchema.safeParse(rawAgendaInput({ title: "" })).success
  );
  check(
    "rejects bad session type",
    !agendaInputSchema.safeParse(rawAgendaInput({ type: "BANQUET" })).success
  );
  check(
    "rejects end before start",
    !agendaInputSchema.safeParse(
      rawAgendaInput({
        startsAtLocal: "2030-06-01T12:00",
        endsAtLocal: "2030-06-01T10:00",
      })
    ).success
  );
  check(
    "rejects malformed datetime",
    !agendaInputSchema.safeParse(
      rawAgendaInput({ startsAtLocal: "June 1" })
    ).success
  );

  console.log("\n— CRUD without event —");
  const a1 = await createAgendaItem(
    scriptDb,
    agendaInput({ title: "TEST_Standalone Session", published: true })
  );
  check("unlinked item created", a1.eventId === null);
  check(
    "unlinked times stored as UTC",
    a1.startsAt.toISOString() === "2030-06-01T10:00:00.000Z"
  );

  const updated = await updateAgendaItem(scriptDb, a1.id, {
    ...agendaInput({ title: "TEST_Standalone Session", published: true }),
    location: "Main stage",
  });
  check("update sets fields", updated?.location === "Main stage");
  check(
    "update of missing item returns null",
    (await updateAgendaItem(scriptDb, "missing", agendaInput())) === null
  );

  console.log("\n— Event association —");
  const event = await scriptDb.event.create({
    data: {
      title: "TEST_Festival",
      slug: "test-festival-agenda",
      description: "test",
      startsAt: new Date("2030-06-01T08:00:00Z"),
      timezone: "Africa/Lagos",
      published: true,
    },
  });

  const a2 = await createAgendaItem(
    scriptDb,
    agendaInput({
      title: "TEST_Linked Session",
      eventId: event.id,
      published: true,
    })
  );
  check("linked item created", a2.eventId === event.id);
  check(
    "times interpreted in event timezone (Lagos 10:00 → 09:00Z)",
    a2.startsAt.toISOString() === "2030-06-01T09:00:00.000Z"
  );

  let badEvent = false;
  try {
    await createAgendaItem(
      scriptDb,
      agendaInput({ title: "TEST_Bad Event", eventId: "no-such-event" })
    );
  } catch (e) {
    badEvent = e instanceof Error && e.message === "invalid_event";
  }
  check("missing event rejected", badEvent);

  // Change association: unlink a2, link a1.
  const relinked = await updateAgendaItem(scriptDb, a1.id, {
    ...agendaInput({ title: "TEST_Standalone Session", published: true }),
    eventId: event.id,
  });
  check("association can be added", relinked?.eventId === event.id);
  const unlinked = await updateAgendaItem(scriptDb, a2.id, {
    ...agendaInput({ title: "TEST_Linked Session" }),
    eventId: null,
  });
  check("association can be removed", unlinked?.eventId === null);

  console.log("\n— Speaker association —");
  const speaker = await scriptDb.speaker.create({
    data: {
      name: "TEST_Speaker One",
      title: "Engineer",
      organization: "Acme",
      bio: "test",
      published: true,
    },
  });
  const a3 = await createAgendaItem(
    scriptDb,
    agendaInput({
      title: "TEST_Speaker Session",
      eventId: event.id,
      speakerIds: [speaker.id],
      published: true,
      startsAtLocal: "2030-06-01T14:00",
      endsAtLocal: "2030-06-01T15:00",
    })
  );
  const a3WithSpeakers = await scriptDb.agendaItem.findUnique({
    where: { id: a3.id },
    include: { speakers: true },
  });
  check(
    "speaker linked on create",
    !!a3WithSpeakers?.speakers.some((s) => s.id === speaker.id)
  );
  const a3Updated = await updateAgendaItem(scriptDb, a3.id, {
    ...agendaInput({
      title: "TEST_Speaker Session",
      eventId: event.id,
      published: true,
      startsAtLocal: "2030-06-01T14:00",
      endsAtLocal: "2030-06-01T15:00",
    }),
    speakerIds: [],
  });
  const a3After = await scriptDb.agendaItem.findUnique({
    where: { id: a3.id },
    include: { speakers: true },
  });
  check(
    "speakers can be cleared on update",
    !!a3Updated && a3After?.speakers.length === 0
  );

  console.log("\n— Public programme —");
  // a1 is linked + published (09:00 UTC), a3 is linked + published (13:00 UTC),
  // a2 is unlinked + published — should not appear on the event's programme.
  const draft = await createAgendaItem(
    scriptDb,
    agendaInput({
      title: "TEST_Draft Session",
      eventId: event.id,
      startsAtLocal: "2030-06-01T09:00",
      endsAtLocal: "2030-06-01T09:30",
    })
  );

  const prog = await queryEventProgramme(scriptDb, event.id);
  check(
    "programme shows only published items for the event",
    prog.some((s) => s.id === a1.id) &&
      prog.some((s) => s.id === a3.id) &&
      !prog.some((s) => s.id === draft.id) &&
      !prog.some((s) => s.id === a2.id)
  );
  check(
    "programme is chronological",
    prog.findIndex((s) => s.id === a1.id) < prog.findIndex((s) => s.id === a3.id)
  );
  check(
    "unpublished item hidden after unpublish",
    !(await (async () => {
      await setAgendaPublished(scriptDb, a3.id, false);
      return queryEventProgramme(scriptDb, event.id);
    })()).some((s) => s.id === a3.id)
  );
  check(
    "programme speaker list excludes unpublished speakers",
    (await (async () => {
      await updateAgendaItem(scriptDb, a3.id, {
        ...agendaInput({
          title: "TEST_Speaker Session",
          eventId: event.id,
          startsAtLocal: "2030-06-01T14:00",
          endsAtLocal: "2030-06-01T15:00",
        }),
        speakerIds: [speaker.id],
        published: true,
      });
      await scriptDb.speaker.update({
        where: { id: speaker.id },
        data: { published: false },
      });
      const p = await queryEventProgramme(scriptDb, event.id);
      const session = p.find((s) => s.id === a3.id);
      return session?.speakers.length ?? -1;
    })()) === 0
  );

  console.log("\n— Filters, ordering —");
  const eventFilter = await listAgendaForAdmin(scriptDb, {
    eventId: event.id,
  });
  check(
    "event filter",
    eventFilter.items.every((i) => i.event?.title === "TEST_Festival") &&
      eventFilter.items.some((i) => i.id === a1.id)
  );
  const unlinkedFilter = await listAgendaForAdmin(scriptDb, {
    eventId: "none",
  });
  check(
    "unlinked filter",
    unlinkedFilter.items.some((i) => i.id === a2.id) &&
      unlinkedFilter.items.every((i) => !i.event)
  );
  const draftFilter = await listAgendaForAdmin(scriptDb, { status: "draft" });
  check(
    "status filter",
    draftFilter.items.every((i) => !i.published)
  );

  const adminOrder = async () =>
    (
      await scriptDb.agendaItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }, { id: "asc" }],
        select: { id: true },
      })
    ).map((a) => a.id);
  const ordered = await adminOrder();
  const idx = ordered.indexOf(a3.id);
  const neighbor = ordered[idx - 1];
  check("moveAgendaItem swaps", await moveAgendaItem(scriptDb, a3.id, -1));
  const after = await adminOrder();
  check(
    "order changed correctly",
    after[idx - 1] === a3.id && after[idx] === neighbor
  );

  console.log("\n— Deletion integrity —");
  await scriptDb.speaker.update({
    where: { id: speaker.id },
    data: { published: true },
  });
  check("deleteEvent preserves agenda items (SetNull)", await (async () => {
    await scriptDb.event.delete({ where: { id: event.id } });
    const items = await scriptDb.agendaItem.findMany({
      where: { title: { startsWith: "TEST_" } },
    });
    return items.length >= 4 && items.every((i) => i.eventId === null);
  })());

  check(
    "deleteAgendaItem returns true",
    await deleteAgendaItem(scriptDb, a3.id)
  );
  check(
    "deleted item gone",
    (await getAgendaItemById(scriptDb, a3.id)) === null
  );
  check(
    "delete of missing item returns false",
    (await deleteAgendaItem(scriptDb, a3.id)) === false
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
