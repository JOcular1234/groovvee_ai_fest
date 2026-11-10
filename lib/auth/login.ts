import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/password";
import {
  checkLoginThrottle,
  clearLoginThrottle,
  recordFailedLogin,
} from "@/lib/auth/rate-limit";
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
  | { ok: false; throttled: true; retryAfterSec: number }
  | { ok: false; throttled?: false };

export async function loginAdmin(
  db: PrismaClient,
  {
    email: rawEmail,
    password,
    ip,
  }: { email: string; password: string; ip: string }
): Promise<LoginResult> {
  const email = normalizeEmail(rawEmail);

  const throttle = await checkLoginThrottle(db, email, ip);
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
    await recordFailedLogin(db, email, ip);
    return { ok: false };
  }

  await clearLoginThrottle(db, email, ip);

  const { token, session } = await createSession(db, admin.id);
  await db.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return { ok: true, token, expiresAt: session.expiresAt };
}
