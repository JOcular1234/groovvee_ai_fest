import { normalizeEmail } from "../lib/auth/password";
import { closeScriptDb, scriptDb as db, waitForDb } from "./prisma";

// Break-glass reset for an admin (including the Super Admin) who lost both
// their authenticator and recovery codes. Requires direct database access,
// clears the second factor and signs the account out everywhere.
// Usage: npm run admin:reset-2fa -- someone@example.com
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run admin:reset-2fa -- <admin email>");
    process.exitCode = 1;
    return;
  }
  await waitForDb();

  const admin = await db.admin.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true },
  });
  if (!admin) {
    console.error("No admin with that email.");
    process.exitCode = 1;
    return;
  }

  await db.$transaction([
    db.admin.update({
      where: { id: admin.id },
      data: {
        totpSecretEnc: null,
        totpEnabledAt: null,
        totpLastStep: null,
        recoveryCodeHashes: [],
      },
    }),
    db.session.deleteMany({ where: { adminId: admin.id } }),
    db.adminAuditLog.create({
      data: {
        actorId: null,
        targetId: admin.id,
        action: "admin.2fa_reset",
        details: { email: admin.email, via: "cli" },
      },
    }),
  ]);
  console.log(`Two-factor auth reset for ${admin.email}. All sessions revoked.`);
}

main()
  .catch((e) => {
    console.error("Failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closeScriptDb);
