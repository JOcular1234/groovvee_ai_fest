import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/password";
import { clearLoginThrottle, consumeLoginAttempt } from "@/lib/auth/rate-limit";
import {
  consumeMfaAttempt,
  issueMfaChallenge,
  readMfaChallenge,
  verifySecondFactor,
} from "@/lib/auth/mfa";
import { createSession } from "@/lib/auth/session";

// Precomputed on first use so failed lookups for unknown emails perform the
// same Argon2id verification work as real accounts (prevents email enumeration
// via response timing).
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(`dummy-${crypto.randomUUID()}`);
  return dummyHashPromise;
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  // Password accepted, but the account has 2FA: no session yet — the caller
  // stores the challenge (httpOnly cookie) for the code step.
  | {
      ok: false;
      mfaRequired: true;
      throttled?: false;
      challenge: string;
      challengeExpiresAt: Date;
    }
  | { ok: false; throttled: true; mfaRequired?: false; retryAfterSec: number }
  | { ok: false; throttled?: false; mfaRequired?: false };

async function startSession(db: PrismaClient, adminId: string) {
  const { token, session } = await createSession(db, adminId);
  await db.admin.update({
    where: { id: adminId },
    data: { lastLoginAt: new Date() },
  });
  return { ok: true as const, token, expiresAt: session.expiresAt };
}

export async function loginAdmin(
  db: PrismaClient,
  {
    email: rawEmail,
    password,
    ip,
  }: { email: string; password: string; ip: string }
): Promise<LoginResult> {
  const email = normalizeEmail(rawEmail);

  // Counted before the password is checked, atomically — parallel guesses
  // can't race past the limit.
  const throttle = await consumeLoginAttempt(db, email, ip);
  if (!throttle.allowed) {
    return { ok: false, throttled: true, retryAfterSec: throttle.retryAfterSec };
  }

  const admin = await db.admin.findUnique({ where: { email } });

  const passwordOk = await verifyPassword(
    admin ? admin.passwordHash : await getDummyHash(),
    password
  );

  // Single generic failure path — unknown email, wrong password and inactive
  // accounts are indistinguishable to the caller.
  if (!admin || !admin.isActive || !passwordOk) {
    return { ok: false };
  }

  await clearLoginThrottle(db, email, ip);

  if (admin.totpEnabledAt) {
    const { token, expiresAt } = issueMfaChallenge(admin);
    return {
      ok: false,
      mfaRequired: true,
      challenge: token,
      challengeExpiresAt: expiresAt,
    };
  }

  return startSession(db, admin.id);
}

export type MfaLoginResult =
  | { ok: true; token: string; expiresAt: Date; usedRecoveryCode: boolean }
  | { ok: false; throttled: true; expired?: false; retryAfterSec: number }
  | { ok: false; expired: true; throttled?: false }
  | { ok: false; throttled?: false; expired?: false };

// Second login step: challenge from the password step + a TOTP or recovery
// code. Attempts are limited per admin (5 / 15 min) on top of the
// challenge's 5-minute lifetime.
export async function completeMfaLogin(
  db: PrismaClient,
  { challenge, code }: { challenge: string; code: string }
): Promise<MfaLoginResult> {
  const admin = await readMfaChallenge(db, challenge);
  if (!admin) return { ok: false, expired: true };

  const throttle = await consumeMfaAttempt(db, admin.id);
  if (!throttle.allowed) {
    return { ok: false, throttled: true, retryAfterSec: throttle.retryAfterSec };
  }

  const method = await verifySecondFactor(db, admin, code);
  if (!method) return { ok: false };

  const session = await startSession(db, admin.id);
  return { ...session, usedRecoveryCode: method === "recovery" };
}
