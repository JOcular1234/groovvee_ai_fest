import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  getApplicationById,
  INVALID_TRANSITION,
  listApplicationsForAdmin,
  NOT_ACCEPTED,
  promoteApplicationToSpeaker,
  setApplicationStatus,
  submitApplication,
  updateApplicationNotes,
} from "../lib/applications";
import { issueFormToken, verifyFormToken } from "../lib/form-token";
import { applicationSubmitSchema } from "../lib/validation/application";

// DB-level test suite for the speaker-application workflow.
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

function rawAppInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "TEST_Applicant",
    email: "TEST_App@Example.COM",
    organization: "",
    talkTitle: "",
    bio: "A sufficiently long bio for a test application.",
    links: [] as { label: string; url: string }[],
    ...overrides,
  };
}

function appInput(overrides: Record<string, unknown> = {}) {
  const parsed = applicationSubmitSchema.safeParse(rawAppInput(overrides));
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

async function makeApplication(overrides: Record<string, unknown> = {}) {
  return submitApplication(scriptDb, appInput(overrides));
}

const cleanup = async () => {
  await scriptDb.speakerApplication.deleteMany({
    where: { name: { startsWith: "TEST_" } },
  });
  await scriptDb.speaker.deleteMany({
    where: { name: { startsWith: "TEST_" } },
  });
};

async function main() {
  console.log("Warming up database…");
  await waitForDb();
  await cleanup();

  console.log("\n— Validation —");
  check(
    "rejects missing name",
    !applicationSubmitSchema.safeParse(rawAppInput({ name: "" })).success
  );
  check(
    "rejects short bio",
    !applicationSubmitSchema.safeParse(rawAppInput({ bio: "short" })).success
  );
  check(
    "rejects invalid email",
    !applicationSubmitSchema.safeParse(rawAppInput({ email: "not-an-email" }))
      .success
  );
  check(
    "rejects non-https link",
    !applicationSubmitSchema.safeParse(
      rawAppInput({ links: [{ label: "Site", url: "http://bad.example" }] })
    ).success
  );
  check(
    "rejects malformed link url",
    !applicationSubmitSchema.safeParse(
      rawAppInput({ links: [{ label: "Site", url: "notaurl" }] })
    ).success
  );
  check(
    "rejects >8 links",
    !applicationSubmitSchema.safeParse(
      rawAppInput({
        links: Array.from({ length: 9 }, (_, i) => ({
          label: `L${i}`,
          url: `https://example.com/${i}`,
        })),
      })
    ).success
  );
  const parsed = applicationSubmitSchema.parse(rawAppInput());
  check("normalizes email to lowercase", parsed.email === "test_app@example.com");
  check("empty optionals become null", parsed.organization === null && parsed.talkTitle === null);
  check(
    "extra workflow fields stripped",
    !("status" in parsed) &&
      !("reviewerId" in parsed) &&
      !("speakerId" in parsed) &&
      !("reviewNotes" in parsed)
  );

  console.log("\n— Form token —");
  const goodToken = issueFormToken();
  check("fresh token verifies (minMs=0)", verifyFormToken(goodToken, 0));
  check(
    "fresh token rejected when min-fill-time not met",
    !verifyFormToken(goodToken, 60_000)
  );
  check(
    "tampered token rejected",
    !verifyFormToken(goodToken.replace(/.$/, "0"), 0)
  );
  check("nonsense token rejected", !verifyFormToken("abc.def", 0));
  check("empty token rejected", !verifyFormToken("", 0));

  console.log("\n— Public submission —");
  const app1 = await makeApplication({
    links: [{ label: "Site", url: "https://example.com/me" }],
  });
  check("submission created as PENDING", app1.status === "PENDING");
  check("email stored normalized", app1.email === "test_app@example.com");
  check("no reviewer on submission", app1.reviewerId === null);
  check("no speaker on submission", app1.speakerId === null);

  console.log("\n— Admin inbox —");
  const app2 = await makeApplication({ name: "TEST_Other", email: "other@test.dev" });
  const inbox = await listApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    page: 1,
  });
  check("inbox lists test applications", inbox.applications.length >= 2);
  check(
    "inbox newest first",
    inbox.applications[0].id === app2.id,
    `${inbox.applications[0].id} !== ${app2.id}`
  );
  const searched = await listApplicationsForAdmin(scriptDb, {
    q: "other@test.dev",
  });
  check(
    "search by email",
    searched.applications.length === 1 && searched.applications[0].id === app2.id
  );
  const pendingOnly = await listApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    status: "PENDING",
  });
  check(
    "status filter PENDING",
    pendingOnly.applications.every((a) => a.status === "PENDING")
  );
  const acceptedOnly = await listApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    status: "ACCEPTED",
  });
  check("status filter ACCEPTED empty", acceptedOnly.applications.length === 0);

  console.log("\n— Review —");
  const reviewer = await scriptDb.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!reviewer) {
    check("reviewer admin exists", false, "no admin in db — cannot test review");
  } else {
    const reviewed = await setApplicationStatus(
      scriptDb,
      app1.id,
      reviewer.id,
      "REVIEWED"
    );
    check(
      "REVIEWED stamps reviewer + timestamp",
      !!reviewed &&
        reviewed.status === "REVIEWED" &&
        reviewed.reviewerId === reviewer.id &&
        reviewed.reviewedAt instanceof Date
    );

    let transitionErr = "";
    try {
      await setApplicationStatus(scriptDb, app1.id, reviewer.id, "REVIEWED");
    } catch (e) {
      transitionErr = (e as Error).message;
    }
    check(
      "REVIEWED→REVIEWED rejected",
      transitionErr === INVALID_TRANSITION,
      transitionErr
    );

    const accepted = await setApplicationStatus(
      scriptDb,
      app1.id,
      reviewer.id,
      "ACCEPTED"
    );
    check("REVIEWED→ACCEPTED allowed", accepted?.status === "ACCEPTED");

    let termErr = "";
    try {
      await setApplicationStatus(scriptDb, app1.id, reviewer.id, "REJECTED");
    } catch (e) {
      termErr = (e as Error).message;
    }
    check("ACCEPTED→REJECTED rejected", termErr === INVALID_TRANSITION);

    const noted = await updateApplicationNotes(
      scriptDb,
      app1.id,
      reviewer.id,
      "Strong fit for keynote"
    );
    check(
      "review notes persist",
      noted?.reviewNotes === "Strong fit for keynote"
    );

    check(
      "missing application status returns null",
      (await setApplicationStatus(scriptDb, "missing", reviewer.id, "REVIEWED")) ===
        null
    );
    check(
      "missing application notes returns null",
      (await updateApplicationNotes(scriptDb, "missing", reviewer.id, "x")) ===
        null
    );
  }

  console.log("\n— Promotion —");
  let promoteErr = "";
  try {
    await promoteApplicationToSpeaker(scriptDb, app2.id);
  } catch (e) {
    promoteErr = (e as Error).message;
  }
  check("non-ACCEPTED promote rejected", promoteErr === NOT_ACCEPTED, promoteErr);
  check(
    "missing application promote rejects",
    await promoteApplicationToSpeaker(scriptDb, "missing").then(
      () => false,
      (e: Error) => e.message === "not_found"
    )
  );

  const speakerId = await promoteApplicationToSpeaker(scriptDb, app1.id);
  const speaker = await scriptDb.speaker.findUnique({
    where: { id: speakerId },
  });
  check("promote creates unpublished speaker", speaker?.published === false);
  check(
    "field mapping correct",
    speaker?.name === app1.name &&
      speaker?.organization === (app1.organization ?? "") &&
      speaker?.bio === app1.bio &&
      JSON.stringify(speaker?.socials) === JSON.stringify(app1.links)
  );
  const afterPromote = await getApplicationById(scriptDb, app1.id);
  check("application speakerId saved", afterPromote?.speakerId === speakerId);
  check("application still ACCEPTED", afterPromote?.status === "ACCEPTED");
  check("application preserved", afterPromote?.bio === app1.bio);

  const speakerCountBefore = await scriptDb.speaker.count({
    where: { name: { startsWith: "TEST_" } },
  });
  const again = await promoteApplicationToSpeaker(scriptDb, app1.id);
  check("repeat promote returns same speaker", again === speakerId);
  const speakerCountAfter = await scriptDb.speaker.count({
    where: { name: { startsWith: "TEST_" } },
  });
  check(
    "repeat promote creates no duplicate",
    speakerCountAfter === speakerCountBefore
  );

  // Concurrency: a fresh accepted app promoted twice in parallel.
  const app3 = await makeApplication({ name: "TEST_Race", email: "race@test.dev" });
  await scriptDb.speakerApplication.update({
    where: { id: app3.id },
    data: { status: "ACCEPTED" },
  });
  const race = await Promise.allSettled([
    promoteApplicationToSpeaker(scriptDb, app3.id),
    promoteApplicationToSpeaker(scriptDb, app3.id),
  ]);
  const winners = race.filter(
    (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
  );
  const raceSpeakers = await scriptDb.speaker.findMany({
    where: { name: "TEST_Race" },
  });
  check("concurrent promote yields one speaker", raceSpeakers.length === 1);
  check(
    "concurrent winner matches linked speaker",
    winners.length >= 1 &&
      winners[0].value === raceSpeakers[0].id &&
      (await scriptDb.speakerApplication.findUnique({
        where: { id: app3.id },
        select: { speakerId: true },
      }))?.speakerId === raceSpeakers[0].id
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await cleanup();
  await closeScriptDb();
  if (failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  await closeScriptDb().catch(() => {});
  process.exit(1);
});
