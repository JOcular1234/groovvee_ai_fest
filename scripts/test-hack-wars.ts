import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  DUPLICATE_APPLICATION,
  getHackWarsApplicationById,
  INVALID_TRANSITION,
  listHackWarsApplicationsForAdmin,
  REGISTRATION_CLOSED,
  setHackWarsApplicationStatus,
  submitHackWarsApplication,
  updateHackWarsApplicationNotes,
} from "../lib/hack-wars";
import { issueFormToken, verifyFormToken } from "../lib/form-token";
import { hackWarsApplySchema } from "../lib/validation/hack-wars";

// DB-level test suite for the AI Hack Wars application workflow.
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

function rawInput(overrides: Record<string, unknown> = {}) {
  return {
    participation: "individual",
    name: "TEST_Leader",
    email: "TEST_Leader@Example.COM",
    phone: "+234 801 234 5678",
    school: "TEST University",
    major: "",
    gradYear: "",
    intro:
      "I build AI tools for students, care about applied ML, and want to test myself against the best builders in the ecosystem.",
    previousExperience: "",
    teamName: "",
    members: [] as { name: string; email: string; school: string }[],
    ...overrides,
  };
}

function applyInput(overrides: Record<string, unknown> = {}) {
  const parsed = hackWarsApplySchema.safeParse(rawInput(overrides));
  if (!parsed.success) {
    throw new Error(
      "test fixture failed to parse: " + JSON.stringify(parsed.error.flatten().fieldErrors)
    );
  }
  return parsed.data;
}

const cleanup = async () => {
  await scriptDb.competitionApplication.deleteMany({
    where: { contactName: { startsWith: "TEST_" } },
  });
  await scriptDb.competitionParticipant.deleteMany({
    where: { name: { startsWith: "TEST_" } },
  });
  await scriptDb.competitionTeam.deleteMany({
    where: { name: { startsWith: "TEST_" } },
  });
  await scriptDb.competition.deleteMany({
    where: { slug: { startsWith: "test-hack-wars" } },
  });
};

async function main() {
  console.log("Warming up database…");
  await waitForDb();
  await cleanup();

  console.log("\n— Setup: TEST competitions —");
  const openComp = await scriptDb.competition.create({
    data: {
      title: "TEST Hack Wars Open",
      slug: "test-hack-wars-open",
      kind: "HACK_WARS",
      description: "test",
      status: "REGISTRATION_OPEN",
      published: true,
    },
  });
  const closedComp = await scriptDb.competition.create({
    data: {
      title: "TEST Hack Wars Upcoming",
      slug: "test-hack-wars-upcoming",
      kind: "HACK_WARS",
      description: "test",
      status: "UPCOMING",
      published: true,
    },
  });
  check("open + closed competitions created", !!openComp.id && !!closedComp.id);

  console.log("\n— Validation —");
  check(
    "rejects missing name",
    !hackWarsApplySchema.safeParse(rawInput({ name: "" })).success
  );
  check(
    "rejects missing email",
    !hackWarsApplySchema.safeParse(rawInput({ email: "" })).success
  );
  check(
    "rejects invalid email",
    !hackWarsApplySchema.safeParse(rawInput({ email: "bad" })).success
  );
  check(
    "rejects invalid phone",
    !hackWarsApplySchema.safeParse(rawInput({ phone: "abc" })).success
  );
  check(
    "rejects missing school",
    !hackWarsApplySchema.safeParse(rawInput({ school: "" })).success
  );
  check(
    "rejects short intro",
    !hackWarsApplySchema.safeParse(rawInput({ intro: "hi" })).success
  );
  check(
    "team without teamName rejected",
    !hackWarsApplySchema.safeParse(
      rawInput({
        participation: "team",
        members: [{ name: "A", email: "a@x.dev", school: "" }],
      })
    ).success
  );
  check(
    "team without members rejected",
    !hackWarsApplySchema.safeParse(
      rawInput({ participation: "team", teamName: "TEST_Team" })
    ).success
  );
  check(
    "three additional members rejected (max 3 total incl leader)",
    !hackWarsApplySchema.safeParse(
      rawInput({
        participation: "team",
        teamName: "TEST_Team",
        members: [
          { name: "A B", email: "a@x.dev", school: "" },
          { name: "C D", email: "c@x.dev", school: "" },
          { name: "E F", email: "e@x.dev", school: "" },
        ],
      })
    ).success
  );
  check(
    "member with same email as leader rejected",
    !hackWarsApplySchema.safeParse(
      rawInput({
        participation: "team",
        teamName: "TEST_Team",
        members: [{ name: "Dup", email: "test_leader@example.com", school: "" }],
      })
    ).success
  );

  const parsed = hackWarsApplySchema.parse(
    rawInput({
      participation: "team",
      teamName: "TEST_Pacers",
      gradYear: "2027",
      major: "Computer Science",
      members: [
        { name: "Member One", email: "M1@Test.dev", school: "TEST Uni" },
        { name: "Member Two", email: "m2@test.dev", school: "" },
      ],
    })
  );
  check("email normalized", parsed.email === "test_leader@example.com");
  check("member emails normalized", parsed.members[0].email === "m1@test.dev");
  check("gradYear parsed to int", parsed.gradYear === 2027);
  check("individual strips team fields", (() => {
    const i = hackWarsApplySchema.parse(
      rawInput({ teamName: "TEST_Ignored", members: [{ name: "Ignored Member", email: "x@x.dev", school: "" }] })
    );
    return i.teamName === null && i.members.length === 0;
  })());
  check(
    "privileged fields stripped",
    !("status" in parsed) && !("reviewerId" in parsed) && !("reviewNotes" in parsed)
  );

  console.log("\n— Form token —");
  const goodToken = issueFormToken();
  check("fresh token verifies (minMs=0)", verifyFormToken(goodToken, 0));
  check("tampered token rejected", !verifyFormToken(goodToken.replace(/.$/, "0"), 0));
  check("nonsense token rejected", !verifyFormToken("abc.def", 0));

  console.log("\n— Public submission —");
  const solo = await submitHackWarsApplication(
    scriptDb,
    openComp.id,
    applyInput()
  );
  check("individual created as PENDING", solo.status === "PENDING");
  check("individual has no team", solo.teamId === null);
  check("email stored normalized", solo.email === "test_leader@example.com");
  check("no reviewer on submission", solo.reviewerId === null);

  const teamApp = await submitHackWarsApplication(
    scriptDb,
    openComp.id,
    applyInput({
      participation: "team",
      email: "teamlead@test.dev",
      teamName: "TEST_Pacers",
      members: [
        { name: "Member One", email: "m1@test.dev", school: "TEST Uni" },
        { name: "Member Two", email: "m2@test.dev", school: "" },
      ],
    })
  );
  const teamDetail = await getHackWarsApplicationById(scriptDb, teamApp.id);
  check("team application links team", !!teamDetail?.team);
  check(
    "team has 3 participants incl leader",
    teamDetail?.team?.participants.length === 3
  );
  check(
    "leader participant flagged",
    teamDetail?.team?.participants.some(
      (p) => p.role === "leader" && p.email === "teamlead@test.dev"
    ) === true
  );
  check(
    "member school stored",
    teamDetail?.team?.participants.some((p) => p.school === "TEST Uni") === true
  );

  let dupErr = "";
  try {
    await submitHackWarsApplication(scriptDb, openComp.id, applyInput());
  } catch (e) {
    dupErr = (e as Error).message;
  }
  check("duplicate application rejected", dupErr === DUPLICATE_APPLICATION, dupErr);

  let closedErr = "";
  try {
    await submitHackWarsApplication(
      scriptDb,
      closedComp.id,
      applyInput({ email: "closed@test.dev" })
    );
  } catch (e) {
    closedErr = (e as Error).message;
  }
  check(
    "closed competition rejects submission",
    closedErr === REGISTRATION_CLOSED,
    closedErr
  );

  console.log("\n— Admin inbox —");
  const inbox = await listHackWarsApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    page: 1,
  });
  check("inbox lists test entries", inbox.applications.length >= 2);
  check(
    "inbox newest first",
    inbox.applications[0].id === teamApp.id,
    `${inbox.applications[0].id} !== ${teamApp.id}`
  );
  const byTeam = await listHackWarsApplicationsForAdmin(scriptDb, {
    q: "Pacers",
  });
  check(
    "search by team name",
    byTeam.applications.length === 1 && byTeam.applications[0].id === teamApp.id
  );
  const bySchool = await listHackWarsApplicationsForAdmin(scriptDb, {
    q: "TEST University",
  });
  check("search by school", bySchool.applications.length >= 2);
  const teamOnly = await listHackWarsApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    participation: "team",
  });
  check(
    "team filter",
    teamOnly.applications.length === 1 && teamOnly.applications[0].id === teamApp.id
  );
  const soloOnly = await listHackWarsApplicationsForAdmin(scriptDb, {
    q: "TEST_",
    participation: "individual",
  });
  check(
    "individual filter",
    soloOnly.applications.length === 1 && soloOnly.applications[0].id === solo.id
  );

  console.log("\n— Review workflow —");
  const reviewer = await scriptDb.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!reviewer) {
    check("reviewer admin exists", false, "no admin in db — cannot test review");
  } else {
    const reviewed = await setHackWarsApplicationStatus(
      scriptDb,
      solo.id,
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

    let transErr = "";
    try {
      await setHackWarsApplicationStatus(scriptDb, solo.id, reviewer.id, "REVIEWED");
    } catch (e) {
      transErr = (e as Error).message;
    }
    check("REVIEWED→REVIEWED rejected", transErr === INVALID_TRANSITION);

    const accepted = await setHackWarsApplicationStatus(
      scriptDb,
      solo.id,
      reviewer.id,
      "ACCEPTED"
    );
    check("REVIEWED→ACCEPTED allowed", accepted?.status === "ACCEPTED");

    let termErr = "";
    try {
      await setHackWarsApplicationStatus(scriptDb, solo.id, reviewer.id, "REJECTED");
    } catch (e) {
      termErr = (e as Error).message;
    }
    check("ACCEPTED→REJECTED rejected", termErr === INVALID_TRANSITION);

    const noted = await updateHackWarsApplicationNotes(
      scriptDb,
      solo.id,
      reviewer.id,
      "TEST internal note"
    );
    check(
      "internal notes persist",
      noted?.reviewNotes === "TEST internal note" &&
        noted?.reviewerId === reviewer.id
    );

    check(
      "missing application status returns null",
      (await setHackWarsApplicationStatus(scriptDb, "missing", reviewer.id, "REVIEWED")) === null
    );
    check(
      "missing application notes returns null",
      (await updateHackWarsApplicationNotes(scriptDb, "missing", reviewer.id, "x")) === null
    );
  }

  console.log("\n— Privacy —");
  check(
    "submission rows carry no review data",
    solo.reviewedAt === null &&
      solo.reviewerId === null &&
      solo.reviewNotes === null
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
