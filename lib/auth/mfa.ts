import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { hashKey, hitLimit, type LimitResult } from "@/lib/rate-limit";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/auth/totp";

// Two-factor authentication for admins: enrollment, the login second step,
// recovery codes and resets.

export const MFA_COOKIE = "groovvee_admin_mfa";
export const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MFA_RULE = { max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 };

// ADMIN_2FA_REQUIRED: "all" | "super_admin" (default) | "none". Required
// admins without 2FA are sent to enrollment before any admin screen.
export function isTwoFactorRequired(admin: { role: string }): boolean {
  const policy = (process.env.ADMIN_2FA_REQUIRED ?? "super_admin").toLowerCase();
  if (policy === "all") return true;
  if (policy === "none") return false;
  return admin.role === "SUPER_ADMIN";
}

// --- Login challenge ------------------------------------------------------
// After a correct password, a short-lived signed challenge (httpOnly cookie)
// identifies the admin for the code step. It's bound to the current password
// hash, so a password change/reset invalidates outstanding challenges.

function challengeKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOTP_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(`mfa-challenge|${raw}`).digest();
}

function challengeSig(adminId: string, exp: number, passwordHash: string) {
  const pw = createHash("sha256").update(passwordHash).digest("hex");
  return createHmac("sha256", challengeKey())
    .update(`${adminId}|${exp}|${pw}`)
    .digest("base64url");
}

export function issueMfaChallenge(admin: { id: string; passwordHash: string }) {
  const exp = Date.now() + MFA_CHALLENGE_TTL_MS;
  return {
    token: `${admin.id}.${exp}.${challengeSig(admin.id, exp, admin.passwordHash)}`,
    expiresAt: new Date(exp),
  };
}

export async function readMfaChallenge(db: PrismaClient, token: string) {
  const [adminId, expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!adminId || !sig || !Number.isFinite(exp) || exp < Date.now()) return null;
  const admin = await db.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive || !admin.totpEnabledAt) return null;
  const expected = Buffer.from(challengeSig(admin.id, exp, admin.passwordHash));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  return admin;
}

export function consumeMfaAttempt(
  db: PrismaClient,
  adminId: string
): Promise<LimitResult> {
  return hitLimit(db, hashKey("mfa", adminId), MFA_RULE);
}

// --- Code verification ----------------------------------------------------

type MfaAdmin = {
  id: string;
  totpSecretEnc: string | null;
  totpLastStep: number | null;
};

// TOTP: the matched step must be newer than the last accepted one — the
// conditional update makes that check-and-set atomic, so a code can't be
// replayed even by parallel requests.
async function verifyTotpOnce(db: PrismaClient, admin: MfaAdmin, code: string) {
  if (!admin.totpSecretEnc) return false;
  const step = verifyTotp(decryptSecret(admin.totpSecretEnc), code);
  if (step === null) return false;
  const { count } = await db.admin.updateMany({
    where: {
      id: admin.id,
      OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
    },
    data: { totpLastStep: step },
  });
  return count === 1;
}

// Recovery codes are single-use: array_remove + ANY() in one statement.
async function consumeRecoveryCode(db: PrismaClient, adminId: string, code: string) {
  const h = hashRecoveryCode(code);
  const n = await db.$executeRaw`
    UPDATE admins SET "recoveryCodeHashes" = array_remove("recoveryCodeHashes", ${h})
    WHERE id = ${adminId} AND ${h} = ANY("recoveryCodeHashes")`;
  return n === 1;
}

export async function verifySecondFactor(
  db: PrismaClient,
  admin: MfaAdmin,
  code: string
): Promise<"totp" | "recovery" | null> {
  const trimmed = code.trim();
  if (/^\d[\d\s]{5,7}$/.test(trimmed)) {
    return (await verifyTotpOnce(db, admin, trimmed)) ? "totp" : null;
  }
  return (await consumeRecoveryCode(db, admin.id, trimmed)) ? "recovery" : null;
}

// --- Enrollment -----------------------------------------------------------

export class MfaError extends Error {
  constructor(
    public code: "already_enabled" | "not_started" | "invalid_code" | "throttled" | "not_enabled",
    message: string
  ) {
    super(message);
  }
}

// Starts (or restarts) enrollment: a fresh secret is stored encrypted but
// inactive until confirmed with a valid code.
export async function beginEnrollment(
  db: PrismaClient,
  admin: { id: string; email: string }
) {
  const current = await db.admin.findUnique({
    where: { id: admin.id },
    select: { totpEnabledAt: true },
  });
  if (current?.totpEnabledAt) {
    throw new MfaError("already_enabled", "Two-factor authentication is already on.");
  }
  const secret = generateTotpSecret();
  await db.admin.update({
    where: { id: admin.id },
    data: { totpSecretEnc: encryptSecret(secret), totpLastStep: null },
  });
  return { secret, uri: otpauthUri(secret, admin.email) };
}

export async function pendingEnrollment(
  db: PrismaClient,
  admin: { id: string; email: string }
) {
  const row = await db.admin.findUnique({
    where: { id: admin.id },
    select: { totpSecretEnc: true, totpEnabledAt: true },
  });
  if (!row?.totpSecretEnc || row.totpEnabledAt) return null;
  const secret = decryptSecret(row.totpSecretEnc);
  return { secret, uri: otpauthUri(secret, admin.email) };
}

// Confirms enrollment with a live code; returns plaintext recovery codes,
// shown exactly once.
export async function confirmEnrollment(
  db: PrismaClient,
  adminId: string,
  code: string
): Promise<string[]> {
  const limit = await consumeMfaAttempt(db, adminId);
  if (!limit.allowed) {
    throw new MfaError("throttled", "Too many attempts. Try again in a few minutes.");
  }
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { id: true, totpSecretEnc: true, totpLastStep: true, totpEnabledAt: true },
  });
  if (!admin?.totpSecretEnc || admin.totpEnabledAt) {
    throw new MfaError("not_started", "Start the setup again.");
  }
  if (!(await verifyTotpOnce(db, admin, code))) {
    throw new MfaError("invalid_code", "That code didn't match. Check your authenticator's time and try again.");
  }
  const codes = generateRecoveryCodes();
  await db.admin.update({
    where: { id: adminId },
    data: {
      totpEnabledAt: new Date(),
      recoveryCodeHashes: codes.map(hashRecoveryCode),
    },
  });
  return codes;
}

export async function regenerateRecoveryCodes(
  db: PrismaClient,
  adminId: string,
  code: string
): Promise<string[]> {
  const limit = await consumeMfaAttempt(db, adminId);
  if (!limit.allowed) {
    throw new MfaError("throttled", "Too many attempts. Try again in a few minutes.");
  }
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { id: true, totpSecretEnc: true, totpLastStep: true, totpEnabledAt: true },
  });
  if (!admin?.totpEnabledAt) throw new MfaError("not_enabled", "Two-factor authentication is off.");
  if (!(await verifyTotpOnce(db, admin, code))) {
    throw new MfaError("invalid_code", "That code didn't match.");
  }
  const codes = generateRecoveryCodes();
  await db.admin.update({
    where: { id: adminId },
    data: { recoveryCodeHashes: codes.map(hashRecoveryCode) },
  });
  return codes;
}

export async function disableOwnTwoFactor(
  db: PrismaClient,
  adminId: string,
  code: string
) {
  const limit = await consumeMfaAttempt(db, adminId);
  if (!limit.allowed) {
    throw new MfaError("throttled", "Too many attempts. Try again in a few minutes.");
  }
  const admin = await db.admin.findUnique({
    where: { id: adminId },
    select: { id: true, totpSecretEnc: true, totpLastStep: true, totpEnabledAt: true },
  });
  if (!admin?.totpEnabledAt) throw new MfaError("not_enabled", "Two-factor authentication is off.");
  if (!(await verifySecondFactor(db, admin, code))) {
    throw new MfaError("invalid_code", "That code didn't match.");
  }
  await clearTwoFactor(db, adminId);
}

export async function clearTwoFactor(db: PrismaClient, adminId: string) {
  await db.admin.update({
    where: { id: adminId },
    data: {
      totpSecretEnc: null,
      totpEnabledAt: null,
      totpLastStep: null,
      recoveryCodeHashes: [],
    },
  });
}
