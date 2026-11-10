import { closeScriptDb, scriptDb, waitForDb } from "./prisma";
import {
  getMessageById,
  listMessagesForAdmin,
  markMessageRead,
  setMessageStatus,
  submitMessage,
  updateMessageNotes,
} from "../lib/messages";
import { issueFormToken, verifyFormToken } from "../lib/form-token";
import { messageSubmitSchema } from "../lib/validation/message";
import { INQUIRY_TYPE_VALUES } from "../lib/inquiry-types";

// DB-level test suite for the contact-message inbox workflow.
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

function rawMessageInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "TEST_Sender",
    email: "TEST_Sender@Example.COM",
    type: "GENERAL",
    subject: "",
    message: "This is a sufficiently long test message body.",
    ...overrides,
  };
}

function msgInput(overrides: Record<string, unknown> = {}) {
  const parsed = messageSubmitSchema.safeParse(rawMessageInput(overrides));
  if (!parsed.success) throw new Error("test fixture failed to parse");
  return parsed.data;
}

async function makeMessage(overrides: Record<string, unknown> = {}) {
  return submitMessage(scriptDb, msgInput(overrides));
}

const cleanup = async () => {
  await scriptDb.contactMessage.deleteMany({
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
    !messageSubmitSchema.safeParse(rawMessageInput({ name: "" })).success
  );
  check(
    "rejects short name",
    !messageSubmitSchema.safeParse(rawMessageInput({ name: "X" })).success
  );
  check(
    "rejects missing email",
    !messageSubmitSchema.safeParse(rawMessageInput({ email: "" })).success
  );
  check(
    "rejects invalid email",
    !messageSubmitSchema.safeParse(rawMessageInput({ email: "not-an-email" }))
      .success
  );
  check(
    "rejects invalid category",
    !messageSubmitSchema.safeParse(rawMessageInput({ type: "NOPE" })).success
  );
  check(
    "rejects missing message",
    !messageSubmitSchema.safeParse(rawMessageInput({ message: "" })).success
  );
  check(
    "rejects short message",
    !messageSubmitSchema.safeParse(rawMessageInput({ message: "short" }))
      .success
  );
  check(
    "rejects overlong message",
    !messageSubmitSchema.safeParse(
      rawMessageInput({ message: "x".repeat(5001) })
    ).success
  );
  check(
    "rejects overlong subject",
    !messageSubmitSchema.safeParse(
      rawMessageInput({ subject: "s".repeat(201) })
    ).success
  );

  let allCategoriesOk = true;
  for (const t of INQUIRY_TYPE_VALUES) {
    const p = messageSubmitSchema.safeParse(rawMessageInput({ type: t }));
    if (!p.success || p.data.type !== t) allCategoriesOk = false;
  }
  check("all eight categories accepted", allCategoriesOk);

  const parsed = messageSubmitSchema.parse(rawMessageInput());
  check("normalizes email to lowercase", parsed.email === "test_sender@example.com");
  check("empty subject becomes null", parsed.subject === null);
  check(
    "privileged fields stripped",
    !("status" in parsed) &&
      !("readAt" in parsed) &&
      !("reviewerId" in parsed) &&
      !("reviewedAt" in parsed) &&
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

  // Configured-secret path: a token signed with FORM_SIGNING_SECRET verifies,
  // and fails once the env var is removed (dev fallback uses a different key).
  process.env.FORM_SIGNING_SECRET = "test-secret-for-messages";
  const secretToken = issueFormToken();
  check("token verifies with configured secret", verifyFormToken(secretToken, 0));
  delete process.env.FORM_SIGNING_SECRET;
  check(
    "secret-signed token rejected without secret",
    !verifyFormToken(secretToken, 0)
  );
  const devToken = issueFormToken();
  check("dev token verifies after secret removed", verifyFormToken(devToken, 0));

  console.log("\n— Public submission —");
  const msg1 = await makeMessage({ subject: "TEST Hello there" });
  check("submission created as NEW", msg1.status === "NEW");
  check("submission unread", msg1.readAt === null);
  check("email stored normalized", msg1.email === "test_sender@example.com");
  check("no reviewer on submission", msg1.reviewerId === null);
  check("no review notes on submission", msg1.reviewNotes === null);
  const msg2 = await makeMessage({
    name: "TEST_Partner",
    email: "partner@test.dev",
    type: "PARTNERSHIP",
    subject: "Sponsorship idea",
  });

  console.log("\n— Admin inbox —");
  const inbox = await listMessagesForAdmin(scriptDb, { q: "TEST_", page: 1 });
  check("inbox lists test messages", inbox.messages.length >= 2);
  check(
    "inbox newest first",
    inbox.messages[0].id === msg2.id,
    `${inbox.messages[0].id} !== ${msg2.id}`
  );
  const byEmail = await listMessagesForAdmin(scriptDb, {
    q: "partner@test.dev",
  });
  check(
    "search by email",
    byEmail.messages.length === 1 && byEmail.messages[0].id === msg2.id
  );
  const byMessage = await listMessagesForAdmin(scriptDb, {
    q: "sufficiently long test message",
  });
  check("search by message body", byMessage.messages.length >= 1);
  const byType = await listMessagesForAdmin(scriptDb, {
    q: "TEST_",
    type: "PARTNERSHIP",
  });
  check(
    "category filter",
    byType.messages.length === 1 && byType.messages[0].id === msg2.id
  );
  const byStatus = await listMessagesForAdmin(scriptDb, {
    q: "TEST_",
    status: "NEW",
  });
  check(
    "status filter NEW",
    byStatus.messages.every((m) => m.status === "NEW")
  );
  const unreadOnly = await listMessagesForAdmin(scriptDb, {
    q: "TEST_",
    read: "unread",
  });
  check(
    "unread filter",
    unreadOnly.messages.every((m) => m.readAt === null)
  );

  console.log("\n— Review workflow —");
  const reviewer = await scriptDb.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!reviewer) {
    check("reviewer admin exists", false, "no admin in db — cannot test review");
  } else {
    const opened = await markMessageRead(scriptDb, msg1.id);
    check(
      "opening NEW sets READ + readAt",
      opened?.status === "READ" && opened?.readAt instanceof Date
    );
    const readAt1 = opened?.readAt;
    await new Promise((r) => setTimeout(r, 20));
    const reopened = await markMessageRead(scriptDb, msg1.id);
    check(
      "reopening does not reset readAt",
      reopened?.readAt?.getTime() === readAt1?.getTime()
    );

    const inProgress = await setMessageStatus(
      scriptDb,
      msg1.id,
      reviewer.id,
      "IN_PROGRESS"
    );
    check(
      "status update persists with reviewer",
      inProgress?.status === "IN_PROGRESS" &&
        inProgress?.reviewerId === reviewer.id &&
        inProgress?.reviewedAt instanceof Date
    );
    const openedAgain = await markMessageRead(scriptDb, msg1.id);
    check(
      "opening IN_PROGRESS keeps status",
      openedAgain?.status === "IN_PROGRESS"
    );

    const resolved = await setMessageStatus(
      scriptDb,
      msg2.id,
      reviewer.id,
      "RESOLVED"
    );
    check("status RESOLVED allowed", resolved?.status === "RESOLVED");
    await markMessageRead(scriptDb, msg2.id);
    const afterOpen = await getMessageById(scriptDb, msg2.id);
    check(
      "opening RESOLVED keeps status",
      afterOpen?.status === "RESOLVED"
    );

    const noted = await updateMessageNotes(
      scriptDb,
      msg1.id,
      reviewer.id,
      "TEST internal note — do not send"
    );
    check(
      "review notes persist privately",
      noted?.reviewNotes === "TEST internal note — do not send" &&
        noted?.reviewerId === reviewer.id
    );
    const cleared = await updateMessageNotes(
      scriptDb,
      msg1.id,
      reviewer.id,
      ""
    );
    check("empty notes clear to null", cleared?.reviewNotes === null);

    check(
      "missing message status returns null",
      (await setMessageStatus(scriptDb, "missing", reviewer.id, "READ")) ===
        null
    );
    check(
      "missing message notes returns null",
      (await updateMessageNotes(scriptDb, "missing", reviewer.id, "x")) === null
    );
    check("missing message read returns null", (await markMessageRead(scriptDb, "missing")) === null);
    check("missing message get returns null", (await getMessageById(scriptDb, "missing")) === null);
  }

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
