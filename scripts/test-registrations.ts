// Pure/fake-DB checks for event registration. No real database or paid calls.
// Run: npm run test:registrations

import { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  confirmRegistration,
  hashConfirmToken,
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
  title: "My Event",
  slug: "my-event",
  published: true,
  source: "GROOVVEE" as const,
  startsAt: future,
};

const input = { name: "Ada Lovelace", email: "ada@example.com", organization: null };

type FakeOpts = {
  event?: Record<string, unknown> | null;
  createError?: unknown;
  registrations?: Record<string, unknown>[];
  // Row returned by eventRegistration.findUnique (dedupe + confirm lookups).
  existing?: Record<string, unknown> | null;
  updateCount?: number;
};

function fakeDb(opts: FakeOpts = {}) {
  const calls = {
    createData: null as Record<string, unknown> | null,
    findUniqueWhere: null as unknown,
    listWhere: null as unknown,
    updateManyArgs: null as { where: Record<string, unknown>; data: Record<string, unknown> } | null,
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
      findUnique: async () => opts.existing ?? null,
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.updateManyArgs = args;
        return { count: opts.updateCount ?? 1 };
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
    check(
      "happy path → pending with a confirmation token",
      res.ok && res.status === "pending" && !!res.confirmToken
    );
    check(
      "writes eventId + normalized fields only",
      calls.createData?.eventId === "evt-1" &&
        calls.createData?.name === "Ada Lovelace" &&
        calls.createData?.email === "ada@example.com" &&
        calls.createData?.organization === null
    );
    check(
      "stores only the token hash, never the token",
      res.ok &&
        res.status === "pending" &&
        calls.createData?.confirmTokenHash === hashConfirmToken(res.confirmToken!) &&
        !Object.values(calls.createData ?? {}).includes(res.confirmToken)
    );
    check("new registration is not confirmed", calls.createData?.confirmedAt === undefined);
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
    const { db, calls } = fakeDb({
      createError: p2002,
      existing: { id: "reg-1", confirmedAt: new Date(), confirmSentAt: null },
    });
    const res = await registerForEvent(db, "my-event", input);
    check(
      "P2002 + confirmed → already_confirmed (ok, no error leak)",
      res.ok && res.status === "already_confirmed"
    );
    check("already confirmed → row untouched", calls.updateManyArgs === null);
  }
  {
    const { db, calls } = fakeDb({
      createError: p2002,
      existing: { id: "reg-1", confirmedAt: null, confirmSentAt: past },
    });
    const res = await registerForEvent(db, "my-event", input);
    check(
      "P2002 + pending → fresh token (old link rotated)",
      res.ok &&
        res.status === "pending" &&
        !!res.confirmToken &&
        calls.updateManyArgs?.data.confirmTokenHash === hashConfirmToken(res.confirmToken)
    );
    check(
      "resend is conditional on still-pending + throttle window",
      calls.updateManyArgs?.where.confirmedAt === null &&
        Array.isArray(calls.updateManyArgs?.where.OR)
    );
  }
  {
    const { db } = fakeDb({
      createError: p2002,
      existing: { id: "reg-1", confirmedAt: null, confirmSentAt: new Date() },
      updateCount: 0,
    });
    const res = await registerForEvent(db, "my-event", input);
    check(
      "P2002 + link sent moments ago → no new email (token null)",
      res.ok && res.status === "pending" && res.confirmToken === null
    );
  }

  console.log("confirmRegistration");
  {
    const { db, calls } = fakeDb({
      existing: { id: "reg-1", event: { ...groovveeEvent } },
    });
    const res = await confirmRegistration(db, "tok");
    check("valid token confirms", res.ok);
    check(
      "confirm clears the token and stamps confirmedAt (single use)",
      calls.updateManyArgs?.data.confirmTokenHash === null &&
        calls.updateManyArgs?.data.confirmedAt instanceof Date &&
        calls.updateManyArgs?.where.confirmTokenHash === hashConfirmToken("tok")
    );
  }
  {
    const { db } = fakeDb({ existing: null });
    const res = await confirmRegistration(db, "nope");
    check("unknown token → invalid", !res.ok && res.reason === "invalid");
  }
  {
    const { db } = fakeDb({
      existing: { id: "reg-1", event: { ...groovveeEvent, startsAt: past } },
    });
    const res = await confirmRegistration(db, "tok");
    check("started event → closed", !res.ok && res.reason === "closed");
  }
  {
    const { db } = fakeDb({
      existing: { id: "reg-1", event: { ...groovveeEvent } },
      updateCount: 0,
    });
    const res = await confirmRegistration(db, "tok");
    check("concurrent/replayed confirm → invalid", !res.ok && res.reason === "invalid");
  }
  {
    const { db } = fakeDb();
    const res = await confirmRegistration(db, "x".repeat(101));
    check("oversized token rejected without lookup", !res.ok);
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
