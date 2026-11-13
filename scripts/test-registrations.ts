// Pure/fake-DB checks for event registration. No real database or paid calls.
// Run: npm run test:registrations

import { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  isRegistrationOpen,
  listRegistrationsForAdmin,
  registerForEvent,
} from "@/lib/registrations";
import { registrationSubmitSchema } from "@/lib/validation/registration";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

const groovveeEvent = {
  id: "evt-1",
  published: true,
  source: "GROOVVEE" as const,
  startsAt: future,
};

const input = { name: "Ada Lovelace", email: "ada@example.com", organization: null };

type FakeOpts = {
  event?: Record<string, unknown> | null;
  createError?: unknown;
  registrations?: Record<string, unknown>[];
};

function fakeDb(opts: FakeOpts = {}) {
  const calls = {
    createData: null as Record<string, unknown> | null,
    findUniqueWhere: null as unknown,
    listWhere: null as unknown,
  };
  const db = {
    event: {
      findUnique: async (args: unknown) => {
        calls.findUniqueWhere = args;
        return opts.event === undefined ? groovveeEvent : opts.event;
      },
    },
    eventRegistration: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.createData = data;
        if (opts.createError) throw opts.createError;
        return { id: "reg-1", ...data };
      },
      count: async () => (opts.registrations ?? []).length,
      findMany: async (args: { where: unknown }) => {
        calls.listWhere = args.where;
        return opts.registrations ?? [];
      },
    },
  };
  return { db: db as unknown as PrismaClient, calls };
}

const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
  code: "P2002",
  clientVersion: "7.10.1",
});

async function main() {
  console.log("validation");
  check(
    "valid input parses",
    registrationSubmitSchema.safeParse({
      name: "Ada Lovelace",
      email: "ADA@Example.COM ",
      organization: "  Analytical Engines Ltd ",
    }).success
  );
  const parsed = registrationSubmitSchema.parse({
    name: "Ada",
    email: "ADA@Example.COM",
    organization: "",
  });
  check(
    "email normalized + empty org → null",
    parsed.email === "ada@example.com" && parsed.organization === null
  );
  check(
    "invalid email rejected",
    !registrationSubmitSchema.safeParse({ name: "Ada", email: "nope", organization: "" }).success
  );
  check(
    "short name rejected",
    !registrationSubmitSchema.safeParse({ name: "A", email: "a@b.co", organization: "" }).success
  );
  check(
    "oversized org rejected",
    !registrationSubmitSchema.safeParse({
      name: "Ada",
      email: "a@b.co",
      organization: "x".repeat(161),
    }).success
  );

  console.log("eligibility predicate");
  check(
    "groovvee + upcoming → open",
    isRegistrationOpen({ source: "GROOVVEE", startsAt: future })
  );
  check(
    "external → closed",
    !isRegistrationOpen({ source: "EXTERNAL", startsAt: future })
  );
  check(
    "past → closed",
    !isRegistrationOpen({ source: "GROOVVEE", startsAt: past })
  );
  check(
    "starting now → closed",
    !isRegistrationOpen({ source: "GROOVVEE", startsAt: new Date(Date.now() - 1) })
  );

  console.log("registerForEvent");
  {
    const { db, calls } = fakeDb();
    const res = await registerForEvent(db, "my-event", input);
    check("happy path registers", res.ok === true);
    check(
      "writes eventId + normalized fields only",
      calls.createData?.eventId === "evt-1" &&
        calls.createData?.name === "Ada Lovelace" &&
        calls.createData?.email === "ada@example.com" &&
        calls.createData?.organization === null
    );
  }
  {
    const { db, calls } = fakeDb({ event: null });
    const res = await registerForEvent(db, "missing", input);
    check("missing slug → not_found", !res.ok && res.reason === "not_found");
    check("missing slug → no create attempted", calls.createData === null);
  }
  {
    const { db } = fakeDb({ event: { ...groovveeEvent, published: false } });
    const res = await registerForEvent(db, "draft", input);
    check(
      "unpublished → not_found (no draft leak)",
      !res.ok && res.reason === "not_found"
    );
  }
  {
    const { db } = fakeDb({ event: { ...groovveeEvent, source: "EXTERNAL" } });
    const res = await registerForEvent(db, "external", input);
    check(
      "external → not_eligible",
      !res.ok && res.reason === "not_eligible"
    );
  }
  {
    const { db } = fakeDb({ event: { ...groovveeEvent, startsAt: past } });
    const res = await registerForEvent(db, "past", input);
    check("past event → closed", !res.ok && res.reason === "closed");
  }
  {
    const { db } = fakeDb({ createError: p2002 });
    const res = await registerForEvent(db, "my-event", input);
    check(
      "P2002 → duplicate (DB-level dedupe)",
      !res.ok && res.reason === "duplicate"
    );
  }
  {
    const { db } = fakeDb({ createError: new Error("boom") });
    let threw = false;
    try {
      await registerForEvent(db, "my-event", input);
    } catch {
      threw = true;
    }
    check("unexpected errors propagate", threw);
  }

  console.log("admin listing");
  {
    const regs = [
      { id: "r1", name: "A", email: "a@x.co", organization: null, createdAt: new Date() },
    ];
    const { db, calls } = fakeDb({ registrations: regs });
    const res = await listRegistrationsForAdmin(db, "evt-1", { q: "ada" });
    check("admin list returns rows + total", res.total === 1 && res.registrations.length === 1);
    check(
      "admin list scopes to eventId",
      (calls.listWhere as { eventId?: string })?.eventId === "evt-1"
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
