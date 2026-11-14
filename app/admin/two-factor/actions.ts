"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/admins";
import {
  beginEnrollment,
  confirmEnrollment,
  disableOwnTwoFactor,
  isTwoFactorRequired,
  MfaError,
  regenerateRecoveryCodes,
} from "@/lib/auth/mfa";
import { getCurrentAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";

export type TwoFactorState = {
  ok: boolean;
  recoveryCodes?: string[];
  message?: string;
};

// getCurrentAdmin, not requireAdmin — requireAdmin redirects admins who must
// enroll back to this page, which would deadlock the flow.
async function currentAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");
  return admin;
}

function failure(err: unknown, fallback: string): TwoFactorState {
  return { ok: false, message: err instanceof MfaError ? err.message : fallback };
}

export async function startEnrollmentAction(): Promise<void> {
  const admin = await currentAdmin();
  await withDbRetry(() => beginEnrollment(db, admin)).catch((err) => {
    if (!(err instanceof MfaError)) throw err;
  });
  revalidatePath("/admin/two-factor");
  redirect("/admin/two-factor");
}

export async function confirmEnrollmentAction(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const admin = await currentAdmin();
  try {
    const codes = await withDbRetry(() =>
      confirmEnrollment(db, admin.id, String(formData.get("code") ?? ""))
    );
    await writeAuditLog(db, admin.id, admin.id, "admin.2fa_enabled");
    return { ok: true, recoveryCodes: codes };
  } catch (err) {
    return failure(err, "Could not turn on two-factor auth. Try again.");
  }
}

export async function regenerateRecoveryCodesAction(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const admin = await currentAdmin();
  try {
    const codes = await withDbRetry(() =>
      regenerateRecoveryCodes(db, admin.id, String(formData.get("code") ?? ""))
    );
    await writeAuditLog(db, admin.id, admin.id, "admin.2fa_recovery_regenerated");
    return { ok: true, recoveryCodes: codes };
  } catch (err) {
    return failure(err, "Could not regenerate recovery codes. Try again.");
  }
}

export async function disableTwoFactorAction(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const admin = await currentAdmin();
  if (isTwoFactorRequired(admin)) {
    return { ok: false, message: "Two-factor auth is required for your account." };
  }
  try {
    await withDbRetry(() =>
      disableOwnTwoFactor(db, admin.id, String(formData.get("code") ?? ""))
    );
    await writeAuditLog(db, admin.id, admin.id, "admin.2fa_disabled");
  } catch (err) {
    return failure(err, "Could not turn off two-factor auth. Try again.");
  }
  revalidatePath("/admin/two-factor");
  redirect("/admin/two-factor");
}
