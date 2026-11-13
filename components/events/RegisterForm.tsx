"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  submitRegistrationAction,
  type RegisterFormState,
} from "@/app/events/[slug]/register/actions";

const initialState: RegisterFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function RegisterForm({
  eventSlug,
  eventTitle,
  token,
}: {
  eventSlug: string;
  eventTitle: string;
  token: string;
}) {
  const action = submitRegistrationAction.bind(null, eventSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.done) {
    return (
      <div className="border border-volt/40 bg-panel p-10 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {state.duplicate ? "Already on the list" : "You're registered"}
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          {state.duplicate
            ? `This email is already registered for ${eventTitle} — you're all set.`
            : `Your spot at ${eventTitle} is confirmed. See you there.`}
        </p>
        <Link
          href={`/events/${eventSlug}`}
          className="mt-8 inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      <input type="hidden" name="started" value={token} />
      {/* Honeypot — invisible to humans, tempting to bots. Nonstandard name
          prevents browser autofill from populating it for real users. */}
      <div className="absolute -left-250" aria-hidden="true">
        <label>
          Website
          <input name="gvf_extra" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-name" className={labelClass}>
            Full name *
          </label>
          <input
            id="reg-name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
          <FieldError errors={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="reg-email" className={labelClass}>
            Email *
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            className={inputClass}
          />
          <FieldError errors={state.errors?.email} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-organization" className={labelClass}>
            Organization
          </label>
          <input
            id="reg-organization"
            name="organization"
            maxLength={160}
            autoComplete="organization"
            className={inputClass}
          />
          <FieldError errors={state.errors?.organization} />
        </div>
      </div>

      {state.message && (
        <p className="mt-6 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 bg-volt px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Registering…" : "Register"}
        </button>
        <Link
          href={`/events/${eventSlug}`}
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
