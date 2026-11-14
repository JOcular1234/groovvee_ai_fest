"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  confirmEnrollmentAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
  startEnrollmentAction,
  type TwoFactorState,
} from "@/app/admin/two-factor/actions";

const initialState: TwoFactorState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-panel px-4 py-3.5 font-mono tracking-[0.3em] text-white outline-none transition-colors placeholder:text-muted/50 focus:border-volt";
const labelClass =
  "font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60";
const outlineBtn =
  "border border-white/25 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt disabled:opacity-60";

function Message({ state }: { state: TwoFactorState }) {
  if (!state.message) return null;
  return (
    <p role="alert" className="mt-3 border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
      {state.message}
    </p>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="mt-8 border border-volt/40 bg-panel p-6">
      <p className={labelClass}>Save your recovery codes</p>
      <p className="mt-2 text-sm text-muted">
        Each code works once if you lose your authenticator. They won&apos;t be
        shown again — store them in a password manager.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm text-white">
        {codes.map((c) => (
          <li key={c} className="border border-white/10 bg-ink px-3 py-2">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}
        className={`mt-4 ${outlineBtn}`}
      >
        Copy codes
      </button>
      <Link href="/admin" className={`mt-6 ${primaryBtn}`}>
        I&apos;ve saved them — continue
      </Link>
    </div>
  );
}

function CodeForm({
  action,
  pending,
  label,
  submit,
  hint,
}: {
  action: (fd: FormData) => void;
  pending: boolean;
  label: string;
  submit: string;
  hint?: string;
}) {
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label className={labelClass}>
          {label}
          <input
            name="code"
            required
            maxLength={20}
            autoComplete="one-time-code"
            placeholder="123456"
            className={`mt-2 ${inputClass}`}
          />
        </label>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      <button type="submit" disabled={pending} className={outlineBtn}>
        {pending ? "Working…" : submit}
      </button>
    </form>
  );
}

export function TwoFactorPanel({
  enabled,
  required,
  setup,
  recoveryRemaining,
  usedRecoveryCode,
}: {
  enabled: boolean;
  required: boolean;
  setup: { secret: string; qr: string } | null;
  recoveryRemaining: number;
  usedRecoveryCode: boolean;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmEnrollmentAction,
    initialState
  );
  const [regenState, regenAction, regenPending] = useActionState(
    regenerateRecoveryCodesAction,
    initialState
  );
  const [disableState, disableAction, disablePending] = useActionState(
    disableTwoFactorAction,
    initialState
  );

  const freshCodes = confirmState.recoveryCodes ?? regenState.recoveryCodes;
  if (freshCodes) return <RecoveryCodes codes={freshCodes} />;

  if (enabled) {
    return (
      <div className="mt-8 space-y-8">
        {usedRecoveryCode && (
          <p role="status" className="border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            You signed in with a recovery code. {recoveryRemaining} left —
            regenerate a fresh set below if you&apos;re running low.
          </p>
        )}
        <p className="border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          Two-factor auth is on · {recoveryRemaining} recovery code
          {recoveryRemaining === 1 ? "" : "s"} left
        </p>

        <div>
          <p className="font-semibold text-white">Regenerate recovery codes</p>
          <p className="mt-1 text-sm text-muted">
            Replaces all existing recovery codes.
          </p>
          <CodeForm
            action={regenAction}
            pending={regenPending}
            label="Authenticator code"
            submit="Regenerate"
          />
          <Message state={regenState} />
        </div>

        {!required && (
          <div className="border-t border-white/10 pt-8">
            <p className="font-semibold text-white">Turn off two-factor auth</p>
            <p className="mt-1 text-sm text-muted">
              Your account will be protected by your password only.
            </p>
            <CodeForm
              action={disableAction}
              pending={disablePending}
              label="Authenticator or recovery code"
              submit="Turn off"
            />
            <Message state={disableState} />
          </div>
        )}
      </div>
    );
  }

  if (!setup) {
    return (
      <form action={startEnrollmentAction} className="mt-8">
        <button type="submit" className={primaryBtn}>
          Set up authenticator app
        </button>
      </form>
    );
  }

  return (
    <div className="mt-8">
      <p className={labelClass}>1 · Scan this code</p>
      <div className="mt-3 flex flex-wrap items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR, nothing to optimize */}
        <img
          src={setup.qr}
          alt="QR code for your authenticator app"
          width={180}
          height={180}
          className="bg-white"
        />
        <div className="min-w-0 flex-1 text-sm text-muted">
          Can&apos;t scan? Enter this key manually:
          <p className="mt-2 break-all border border-white/10 bg-panel px-3 py-2 font-mono text-xs text-white">
            {setup.secret.match(/.{1,4}/g)?.join(" ")}
          </p>
        </div>
      </div>

      <p className={`mt-8 ${labelClass}`}>2 · Enter the 6-digit code</p>
      <form action={confirmAction} className="mt-3 space-y-4">
        <input
          name="code"
          required
          inputMode="numeric"
          maxLength={8}
          autoComplete="one-time-code"
          placeholder="123456"
          aria-label="6-digit code"
          className={inputClass}
        />
        <button type="submit" disabled={confirmPending} className={primaryBtn}>
          {confirmPending ? "Verifying…" : "Turn on two-factor auth"}
        </button>
      </form>
      <Message state={confirmState} />
    </div>
  );
}
