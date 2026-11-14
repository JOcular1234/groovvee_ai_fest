"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  deleteAdminAction,
  resetAdminPasswordAction,
  resetAdminTwoFactorAction,
  setAdminActiveAction,
  setAdminRoleAction,
  type AdminFormState,
} from "@/app/admin/(protected)/admins/actions";

const initialState: AdminFormState = { ok: false };

export function AdminDangerZone({
  adminId,
  isActive,
  role,
  isSelf,
  twoFactorEnabled,
}: {
  adminId: string;
  isActive: boolean;
  role: "ADMIN" | "SUPER_ADMIN";
  isSelf: boolean;
  twoFactorEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [resetState, resetAction, resetPending] = useActionState(
    resetAdminPasswordAction,
    initialState
  );
  const [newPassword, setNewPassword] = useState("");

  function toggleActive() {
    if (
      isActive &&
      !window.confirm(
        "Deactivate this admin? They will be signed out immediately and lose all access."
      )
    ) {
      return;
    }
    setToggleError(null);
    startTransition(async () => {
      const result = await setAdminActiveAction(adminId, !isActive);
      if (!result.ok) {
        setToggleError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function changeRole() {
    const next = role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN";
    if (
      !window.confirm(
        next === "SUPER_ADMIN"
          ? "Promote to Super Admin? They will get full access to every section and can manage other admins."
          : "Demote to Admin? They lose all access until section permissions are assigned."
      )
    ) {
      return;
    }
    setToggleError(null);
    startTransition(async () => {
      const result = await setAdminRoleAction(adminId, next);
      if (!result.ok) {
        setToggleError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function deleteAccount() {
    if (
      !window.confirm(
        "Permanently delete this admin? Their sessions end immediately and the account cannot be recovered. Audit history is kept."
      )
    ) {
      return;
    }
    setToggleError(null);
    startTransition(async () => {
      const result = await deleteAdminAction(adminId);
      if (!result.ok) {
        setToggleError(result.message);
        return;
      }
      router.push("/admin/admins");
      router.refresh();
    });
  }

  function resetTwoFactor() {
    if (
      !window.confirm(
        "Reset two-factor auth? Only do this after verifying the admin's identity. They will be signed out and must set it up again."
      )
    ) {
      return;
    }
    setToggleError(null);
    startTransition(async () => {
      const result = await resetAdminTwoFactorAction(adminId);
      if (!result.ok) {
        setToggleError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-10 border border-red-400/30 bg-panel p-8">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-red-300">
        Danger zone
      </p>

      {toggleError && (
        <p role="alert" className="mt-4 text-xs text-red-400">
          {toggleError}
        </p>
      )}

      {!isSelf && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="font-semibold text-white">
              {role === "SUPER_ADMIN"
                ? "Demote to admin"
                : "Promote to super admin"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {role === "SUPER_ADMIN"
                ? "They lose all access until section permissions are assigned."
                : "They get full access to every section and can manage admins."}
            </p>
          </div>
          <button
            type="button"
            onClick={changeRole}
            disabled={pending}
            className="border border-red-400/40 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-60"
          >
            {pending
              ? "Working…"
              : role === "SUPER_ADMIN"
                ? "Demote"
                : "Promote"}
          </button>
        </div>
      )}

      {role === "ADMIN" && (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="font-semibold text-white">
            {isActive ? "Deactivate account" : "Reactivate account"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isActive
              ? "Immediately revokes all sessions and blocks sign-in. History is preserved."
              : "Restores access with the previously assigned permissions."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending}
          className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors disabled:opacity-60 ${
            isActive
              ? "border border-red-400/40 text-red-300 hover:bg-red-400/10"
              : "border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
          }`}
        >
          {pending ? "Working…" : isActive ? "Deactivate" : "Reactivate"}
        </button>
      </div>
      )}

      {role === "ADMIN" && twoFactorEnabled && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="font-semibold text-white">Reset two-factor auth</p>
            <p className="mt-1 text-sm text-muted">
              For an admin who lost their authenticator and recovery codes.
              Signs them out everywhere.
            </p>
          </div>
          <button
            type="button"
            onClick={resetTwoFactor}
            disabled={pending}
            className="border border-red-400/40 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-60"
          >
            {pending ? "Working…" : "Reset 2FA"}
          </button>
        </div>
      )}

      {role === "ADMIN" && (
      <form action={resetAction} className="mt-6">
        <input type="hidden" name="id" value={adminId} />
        <p className="font-semibold text-white">Reset password</p>
        <p className="mt-1 text-sm text-muted">
          Assign a new temporary password. All sessions are revoked and the
          admin must set their own password on next sign-in.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="New temporary password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="min-w-60 flex-1 border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt"
          />
          <button
            type="submit"
            disabled={resetPending}
            className="border border-white/25 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt disabled:opacity-60"
          >
            {resetPending ? "Resetting…" : "Reset password"}
          </button>
        </div>
        {resetState.errors?.password && (
          <p className="mt-1 text-xs text-red-400">
            {resetState.errors.password[0]}
          </p>
        )}
        {resetState.message && (
          <p
            role={resetState.ok ? "status" : "alert"}
            className={`mt-3 border px-4 py-3 text-sm ${
              resetState.ok
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/40 bg-red-400/10 text-red-300"
            }`}
          >
            {resetState.message}
          </p>
        )}
      </form>
      )}

      {role === "ADMIN" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-red-400/30 pt-6">
          <div>
            <p className="font-semibold text-red-300">Delete account</p>
            <p className="mt-1 text-sm text-muted">
              Permanently removes the account and all its sessions. Audit
              history is kept. Deactivate instead if they may return.
            </p>
          </div>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={pending}
            className="bg-red-500/90 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {pending ? "Working…" : "Delete permanently"}
          </button>
        </div>
      )}
    </div>
  );
}
