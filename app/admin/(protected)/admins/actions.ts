"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminAccountError,
  createAdmin,
  deleteAdmin,
  resetAdminPassword,
  resetAdminTwoFactor,
  setAdminActive,
  setAdminRole,
  updateAdmin,
} from "@/lib/admins";
import { permissionsFromForm } from "@/lib/auth/permissions";
import { requireSuperAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";

export type AdminFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

function fieldErrors(err: AdminAccountError): Record<string, string[]> {
  const field =
    err.code === "duplicate_email" || err.code === "invalid_email"
      ? "email"
      : err.code === "weak_password"
        ? "password"
        : "name";
  return { [field]: err.details ?? [err.message] };
}

export async function createAdminAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const actor = await requireSuperAdmin();

  try {
    await withDbRetry(() =>
      createAdmin(db, actor.id, {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "ADMIN"),
        permissions: permissionsFromForm(formData),
      })
    );
  } catch (err) {
    if (err instanceof AdminAccountError) {
      return { ok: false, errors: fieldErrors(err) };
    }
    return { ok: false, message: "Could not create the admin. Try again." };
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}

export async function updateAdminAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const actor = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");

  try {
    await withDbRetry(() =>
      updateAdmin(db, actor.id, id, {
        name: String(formData.get("name") ?? ""),
        permissions: permissionsFromForm(formData),
      })
    );
  } catch (err) {
    if (err instanceof AdminAccountError) {
      if (err.code === "invalid_name") {
        return { ok: false, errors: fieldErrors(err) };
      }
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not update the admin. Try again." };
  }

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true, message: "Admin updated." };
}

export async function setAdminActiveAction(
  id: string,
  active: boolean
): Promise<AdminActionResult> {
  const actor = await requireSuperAdmin();

  try {
    await withDbRetry(() => setAdminActive(db, actor.id, id, active));
  } catch (err) {
    if (err instanceof AdminAccountError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Operation failed. Try again." };
  }

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}

export async function setAdminRoleAction(
  id: string,
  role: string
): Promise<AdminActionResult> {
  const actor = await requireSuperAdmin();

  try {
    await withDbRetry(() => setAdminRole(db, actor.id, id, role));
  } catch (err) {
    if (err instanceof AdminAccountError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not change the role. Try again." };
  }

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}

export async function deleteAdminAction(
  id: string
): Promise<AdminActionResult> {
  const actor = await requireSuperAdmin();

  try {
    await withDbRetry(() => deleteAdmin(db, actor.id, id));
  } catch (err) {
    if (err instanceof AdminAccountError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not delete the admin. Try again." };
  }

  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function resetAdminPasswordAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const actor = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");

  try {
    await withDbRetry(() =>
      resetAdminPassword(
        db,
        actor.id,
        id,
        String(formData.get("password") ?? "")
      )
    );
  } catch (err) {
    if (err instanceof AdminAccountError) {
      if (err.code === "weak_password") {
        return { ok: false, errors: fieldErrors(err) };
      }
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not reset the password. Try again." };
  }

  revalidatePath(`/admin/admins/${id}`);
  return {
    ok: true,
    message:
      "Password reset. The admin must set a new password on next sign-in — all existing sessions were revoked.",
  };
}

export async function resetAdminTwoFactorAction(
  id: string
): Promise<AdminActionResult> {
  const actor = await requireSuperAdmin();
  try {
    await withDbRetry(() => resetAdminTwoFactor(db, actor.id, id));
  } catch (err) {
    if (err instanceof AdminAccountError) return { ok: false, message: err.message };
    return { ok: false, message: "Could not reset two-factor auth. Try again." };
  }
  revalidatePath(`/admin/admins/${id}`);
  return { ok: true };
}
