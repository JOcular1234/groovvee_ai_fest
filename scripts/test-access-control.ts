import {
  AdminAccountError,
  changeOwnPassword,
  createAdmin,
  resetAdminPassword,
  setAdminActive,
  updateAdmin,
} from "../lib/admins";
import { loginAdmin } from "../lib/auth/login";
import {
  hasSectionAccess,
  permissionsFromForm,
  sanitizePermissions,
  sectionAccessLevel,
  visibleSections,
} from "../lib/auth/permissions";
import {
  createSession,
  getAdminByToken,
} from "../lib/auth/session";
import { normalizeEmail } from "../lib/auth/password";
import { closeScriptDb, scriptDb as db, waitForDb } from "./prisma";

// Runs against the DEV database. All created rows are removed on exit.
const RUN = Date.now().toString(36);
const EMAIL = `acl-test-${RUN}@example.com`;
const PASSWORD = "Temp-Horse-999";
const NEW_PASSWORD = "Fresh-Password-123";
const IP = "10.8.8.8";

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

const createdAdminIds: string[] = [];

async function cleanup() {
  await db.adminAuditLog.deleteMany({
    where: { targetId: { in: createdAdminIds } },
  });
  await db.admin.deleteMany({
    where: { email: normalizeEmail(EMAIL) },
  });
  await db.loginThrottle.deleteMany({});
}

async function main() {
  console.log("Access-control test run", RUN);
  await waitForDb();

  const superAdmin = await db.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  check("a SUPER_ADMIN exists to act as actor", !!superAdmin);
  if (!superAdmin) return;
  const actorId = superAdmin.id;

  // --- Permission helpers ---
  const viewer = { role: "ADMIN" as const, permissions: ["events:view"] };
  check(
    "view grant allows view",
    hasSectionAccess(viewer, "events", "view") === true
  );
  check(
    "view grant denies manage",
    hasSectionAccess(viewer, "events", "manage") === false
  );
  check(
    "manage grant implies view",
    hasSectionAccess(
      { role: "ADMIN", permissions: ["news:manage"] },
      "news",
      "view"
    ) === true
  );
  check(
    "no grant denies view",
    hasSectionAccess(viewer, "messages", "view") === false
  );
  check(
    "SUPER_ADMIN bypasses all checks",
    hasSectionAccess({ role: "SUPER_ADMIN", permissions: [] }, "news", "manage") ===
      true
  );
  check(
    "visibleSections only lists granted sections",
    visibleSections(viewer).map((s) => s.key).join() === "events"
  );
  check(
    "sanitizePermissions drops unknown sections/levels",
    sanitizePermissions(["events:view", "bogus:view", "news:root", 42]).join() ===
      "events:view"
  );

  const fd = new FormData();
  fd.set("perm_events", "manage");
  fd.set("perm_news", "view");
  fd.set("perm_speakers", "nonsense");
  fd.set("perm_admins", "manage"); // not a grantable section
  check(
    "permissionsFromForm maps selects to canonical keys",
    permissionsFromForm(fd).sort().join() ===
      ["events:manage", "news:view"].sort().join()
  );

  // --- createAdmin ---
  const admin = await createAdmin(db, actorId, {
    name: "ACL Test",
    email: EMAIL,
    password: PASSWORD,
    permissions: ["events:view", "messages:manage", "bogus:manage"],
  });
  createdAdminIds.push(admin.id);
  check("created admin has ADMIN role", admin.role === "ADMIN");
  check(
    "mustChangePassword forced on creation",
    admin.mustChangePassword === true
  );
  check(
    "permissions sanitized on write",
    admin.permissions.sort().join() === ["events:view", "messages:manage"].sort().join()
  );
  const createdRow = await db.admin.findUnique({ where: { id: admin.id } });
  check(
    "temp password stored hashed only",
    !!createdRow && !createdRow.passwordHash.includes(PASSWORD)
  );

  const dup = await createAdmin(db, actorId, {
    name: "Dup",
    email: EMAIL.toUpperCase(),
    password: PASSWORD,
    permissions: [],
  }).catch((e) => e);
  check(
    "duplicate email rejected",
    dup instanceof AdminAccountError && dup.code === "duplicate_email"
  );

  const weak = await createAdmin(db, actorId, {
    name: "Weak",
    email: `weak-${RUN}@example.com`,
    password: "short",
    permissions: [],
  }).catch((e) => e);
  check(
    "weak password rejected",
    weak instanceof AdminAccountError && weak.code === "weak_password"
  );

  // --- Session + mustChangePassword visibility ---
  const login = await loginAdmin(db, { email: EMAIL, password: PASSWORD, ip: IP });
  check("new admin can log in", login.ok === true);
  if (login.ok) {
    const who = await getAdminByToken(db, login.token);
    check(
      "session exposes mustChangePassword + permissions",
      who?.mustChangePassword === true &&
        who?.permissions.includes("events:view")
    );
  }

  // --- updateAdmin permissions ---
  await updateAdmin(db, actorId, admin.id, {
    name: "ACL Test Renamed",
    permissions: ["events:manage"],
  });
  const afterUpdate = await db.admin.findUnique({ where: { id: admin.id } });
  check(
    "permission update stored",
    afterUpdate?.permissions.join() === "events:manage" &&
      afterUpdate?.name === "ACL Test Renamed"
  );
  check(
    "access level reports manage",
    sectionAccessLevel(
      { role: "ADMIN", permissions: afterUpdate?.permissions ?? [] },
      "events"
    ) === "manage"
  );

  // --- Deactivation kills live sessions ---
  const { token: liveToken } = await createSession(db, admin.id);
  check(
    "fresh session resolves",
    (await getAdminByToken(db, liveToken))?.id === admin.id
  );
  await setAdminActive(db, actorId, admin.id, false);
  check(
    "deactivation revokes live sessions",
    (await getAdminByToken(db, liveToken)) === null
  );
  const inactiveLogin = await loginAdmin(db, {
    email: EMAIL,
    password: PASSWORD,
    ip: IP,
  });
  check("deactivated admin cannot log in", !inactiveLogin.ok);

  const deactivated = await db.admin.findUnique({ where: { id: admin.id } });
  check("deactivatedAt stamped", !!deactivated?.deactivatedAt);

  await setAdminActive(db, actorId, admin.id, true);
  const reactivated = await db.admin.findUnique({ where: { id: admin.id } });
  check(
    "reactivation clears deactivatedAt",
    reactivated?.isActive === true && reactivated.deactivatedAt === null
  );

  // --- SUPER_ADMIN is a protected target ---
  const superTarget = await setAdminActive(
    db,
    actorId,
    superAdmin.id,
    false
  ).catch((e) => e);
  check(
    "super admin cannot be deactivated",
    superTarget instanceof AdminAccountError &&
      superTarget.code === "protected_target"
  );
  const superEdit = await updateAdmin(db, actorId, superAdmin.id, {
    name: "Hijack",
    permissions: [],
  }).catch((e) => e);
  check(
    "super admin cannot be edited",
    superEdit instanceof AdminAccountError &&
      superEdit.code === "protected_target"
  );

  // --- Password reset ---
  const { token: t2 } = await createSession(db, admin.id);
  await resetAdminPassword(db, actorId, admin.id, "Reset-Temp-777");
  const afterReset = await db.admin.findUnique({ where: { id: admin.id } });
  check(
    "reset forces mustChangePassword + kills sessions",
    afterReset?.mustChangePassword === true &&
      (await getAdminByToken(db, t2)) === null
  );

  // --- changeOwnPassword (first-login flow) ---
  const wrong = await changeOwnPassword(
    db,
    admin.id,
    "not-a-token",
    "wrong-old-password",
    NEW_PASSWORD
  ).catch((e) => e);
  check(
    "wrong current password rejected",
    wrong instanceof AdminAccountError && wrong.code === "wrong_password"
  );

  const { token: keepToken } = await createSession(db, admin.id);
  const { token: killToken } = await createSession(db, admin.id);
  await changeOwnPassword(db, admin.id, keepToken, "Reset-Temp-777", NEW_PASSWORD);
  const afterChange = await db.admin.findUnique({ where: { id: admin.id } });
  check(
    "password change clears mustChangePassword",
    afterChange?.mustChangePassword === false
  );
  check(
    "current session survives, others revoked",
    (await getAdminByToken(db, keepToken))?.id === admin.id &&
      (await getAdminByToken(db, killToken)) === null
  );
  const relogin = await loginAdmin(db, {
    email: EMAIL,
    password: NEW_PASSWORD,
    ip: IP,
  });
  check("new password works", relogin.ok === true);

  // --- Audit trail ---
  const logs = await db.adminAuditLog.findMany({
    where: { targetId: admin.id },
    orderBy: { createdAt: "asc" },
  });
  const actions = logs.map((l) => l.action);
  check(
    "audit trail recorded all operations",
    ["admin.created", "admin.updated", "admin.deactivated", "admin.reactivated", "admin.password_reset"].every(
      (a) => actions.includes(a)
    ),
    actions.join(",")
  );
  check(
    "audit entries carry actor",
    logs.every((l) => l.actorId === actorId)
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
