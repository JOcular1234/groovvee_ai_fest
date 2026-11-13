"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  resetAdminPasswordAction,
  setAdminActiveAction,
  type AdminFormState,
} from "@/app/admin/(protected)/admins/actions";

const initialState: AdminFormState = { ok: false };

export function AdminDangerZone({
  adminId,
  isActive,
}: {
  adminId: string;
  isActive: boolean;
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

  return (
    <div className="mt-10 border border-red-400/30 bg-panel p-8">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-red-300">
        Danger zone
      </p>

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
          {toggleError && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {toggleError}
            </p>
          )}
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
    </div>
  );
}
