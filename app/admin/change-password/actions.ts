"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminAccountError, changeOwnPassword } from "@/lib/admins";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { getCurrentAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";

export type ChangePasswordState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  // getCurrentAdmin, not requireAdmin — requireAdmin bounces accounts with
  // mustChangePassword back to this page, which would deadlock the flow.
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/admin/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword !== String(formData.get("confirmPassword") ?? "")) {
    return {
      ok: false,
      errors: { confirmPassword: ["Passwords do not match."] },
    };
  }

  try {
    await withDbRetry(() =>
      changeOwnPassword(
        db,
        admin.id,
        token,
        String(formData.get("currentPassword") ?? ""),
        newPassword
      )
    );
  } catch (err) {
    if (err instanceof AdminAccountError) {
      if (err.code === "wrong_password") {
        return { ok: false, errors: { currentPassword: [err.message] } };
      }
      if (err.code === "weak_password") {
        return {
          ok: false,
          errors: { newPassword: err.details ?? [err.message] },
        };
      }
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not change the password. Try again." };
  }

  redirect("/admin");
}
