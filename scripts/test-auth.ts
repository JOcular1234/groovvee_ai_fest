import {
  ProvisionError,
  provisionSuperAdmin,
} from "../lib/auth/provision";
import { loginAdmin } from "../lib/auth/login";
import {
  createSession,
  getAdminByToken,
  hashSessionToken,
  revokeSessionByToken,
} from "../lib/auth/session";
import { normalizeEmail, passwordIssues } from "../lib/auth/password";
import { closeScriptDb, scriptDb as db, waitForDb } from "./prisma";

// Runs against the DEV database. All created rows are removed on exit.
const RUN = Date.now().toString(36);
const EMAIL = `auth-test-${RUN}@example.com`;
const EMAIL2 = `auth-test2-${RUN}@example.com`;
const PASSWORD = "Correct-Horse-999";
const IP = "10.9.8.7";

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean, extra = "") => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
};

async function cleanup() {
  await db.admin.deleteMany({
    where: { email: { in: [normalizeEmail(EMAIL), normalizeEmail(EMAIL2)] } },
  });
  await db.loginThrottle.deleteMany({});
}

async function main() {
  console.log("Auth test run", RUN);
  await waitForDb();

  const existing = await db.admin.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("! Super Admin already exists — skipping provisioning tests");
  } else {
    // Concurrent provisioning: exactly one must succeed.
    const [r1, r2] = await Promise.allSettled([
      provisionSuperAdmin(db, {
        name: "Test Admin",
        email: EMAIL,
        password: PASSWORD,
      }),
      provisionSuperAdmin(db, {
        name: "Test Admin 2",
        email: EMAIL2,
        password: PASSWORD,
      }),
    ]);
    const winners = [r1, r2].filter((r) => r.status === "fulfilled");
    const losers = [r1, r2].filter((r) => r.status === "rejected");
    check("concurrent provisioning: exactly one winner", winners.length === 1);
    check("concurrent provisioning: loser rejected", losers.length === 1);
    const superAdminCount = await db.admin.count({
      where: { role: "SUPER_ADMIN" },
    });
    check(
      "unique index: exactly one SUPER_ADMIN in DB",
      superAdminCount === 1,
      `count=${superAdminCount}`
    );

    const again = await provisionSuperAdmin(db, {
      name: "Third",
      email: `third-${RUN}@example.com`,
      password: PASSWORD,
    }).catch((e) => e);
    check(
      "re-provisioning refused",
      again instanceof ProvisionError && again.code === "already_exists",
      again instanceof Error ? String(again).slice(0, 200) : ""
    );
  }

  check(
    "weak password rejected",
    passwordIssues("short").length > 0
  );

  const admin = await db.admin.findFirst({
    where: {
      email: { in: [normalizeEmail(EMAIL), normalizeEmail(EMAIL2)] },
    },
  });
  check("provisioned admin exists", !!admin);
  if (!admin) return;
  check("role is SUPER_ADMIN", admin.role === "SUPER_ADMIN");
  check("password is hashed (not plaintext)", !admin.passwordHash.includes(PASSWORD) && admin.passwordHash.startsWith("$argon2"));

  // --- Login flows ---
  const login = await loginAdmin(db, {
    email: admin.email.toUpperCase(),
    password: PASSWORD,
    ip: IP,
  });
  check("successful login returns token", login.ok && login.token.length > 40);

  const afterLogin = await db.admin.findUnique({ where: { id: admin.id } });
  check("lastLoginAt updated", !!afterLogin?.lastLoginAt);

  const badPw = await loginAdmin(db, {
    email: admin.email,
    password: "wrong-password-1",
    ip: IP,
  });
  check("wrong password rejected", !badPw.ok && !badPw.throttled);

  const unknown = await loginAdmin(db, {
    email: `nobody-${RUN}@example.com`,
    password: "whatever-123",
    ip: IP,
  });
  check(
    "unknown email rejected identically (generic)",
    !unknown.ok && !unknown.throttled
  );

  // --- Session lifecycle ---
  if (login.ok) {
    const sessionRow = await db.session.findFirst({
      where: { adminId: admin.id },
      orderBy: { createdAt: "desc" },
    });
    check(
      "session stores SHA-256 hash only",
      !!sessionRow &&
        /^[0-9a-f]{64}$/.test(sessionRow.tokenHash) &&
        sessionRow.tokenHash === hashSessionToken(login.token) &&
        sessionRow.tokenHash !== login.token
    );

    const who = await getAdminByToken(db, login.token);
    check("token resolves to admin", who?.id === admin.id);

    await revokeSessionByToken(db, login.token);
    check("revoked session rejected", (await getAdminByToken(db, login.token)) === null);
  }

  // Deactivation invalidates existing sessions.
  const { token: t2 } = await createSession(db, admin.id);
  await db.admin.update({ where: { id: admin.id }, data: { isActive: false } });
  check(
    "deactivated admin session rejected",
    (await getAdminByToken(db, t2)) === null
  );
  const inactive = await loginAdmin(db, {
    email: admin.email,
    password: PASSWORD,
    ip: IP,
  });
  check("inactive admin cannot log in", !inactive.ok);
  await db.admin.update({ where: { id: admin.id }, data: { isActive: true } });

  // Expired session rejected + swept.
  const { token: t3, session: s3 } = await createSession(db, admin.id);
  await db.session.update({
    where: { id: s3.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  check("expired session rejected", (await getAdminByToken(db, t3)) === null);
  check(
    "expired session row swept",
    (await db.session.findUnique({ where: { id: s3.id } })) === null
  );

  // --- Rate limiting ---
  const throttleIp = "10.7.7.7";
  let lastResult = null as Awaited<ReturnType<typeof loginAdmin>> | null;
  for (let i = 0; i < 6; i++) {
    lastResult = await loginAdmin(db, {
      email: admin.email,
      password: `bad-${i}`,
      ip: throttleIp,
    });
  }
  check(
    "6th failed attempt throttled (429 semantics)",
    !!lastResult && !lastResult.ok && lastResult.throttled === true
  );
  if (lastResult && !lastResult.ok && lastResult.throttled) {
    check(
      "Retry-After reported",
      lastResult.retryAfterSec > 0 && lastResult.retryAfterSec <= 900
    );
  }
  const lockedCorrect = await loginAdmin(db, {
    email: admin.email,
    password: PASSWORD,
    ip: throttleIp,
  });
  check(
    "correct password still blocked while locked",
    !lockedCorrect.ok && lockedCorrect.throttled === true
  );

  // --- Cascade ---
  const sessionsBefore = await db.session.count({ where: { adminId: admin.id } });
  await db.admin.delete({ where: { id: admin.id } });
  const sessionsAfter = await db.session.count({ where: { adminId: admin.id } });
  check(
    "deleting admin cascades sessions",
    sessionsBefore >= 0 && sessionsAfter === 0
  );
}

main()
  .catch((err) => {
    console.error("Test run crashed:", err);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    await closeScriptDb();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  });
