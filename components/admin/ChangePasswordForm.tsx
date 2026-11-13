"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/admin/change-password/actions";

const initialState: ChangePasswordState = { ok: false };

const inputClass =
  "mt-2 w-full border border-white/15 bg-panel px-4 py-3.5 text-white outline-none transition-colors placeholder:text-muted/50 focus:border-volt";
const labelClass =
  "font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="currentPassword" className={labelClass}>
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
        <FieldError errors={state.errors?.currentPassword} />
      </div>

      <div>
        <label htmlFor="newPassword" className={labelClass}>
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Minimum 12 characters with a letter and a digit.
        </p>
        <FieldError errors={state.errors?.newPassword} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <FieldError errors={state.errors?.confirmPassword} />
      </div>

      {state.message && (
        <p
          role="alert"
          className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
