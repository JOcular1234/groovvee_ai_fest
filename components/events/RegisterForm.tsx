"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  submitRegistrationAction,
  type RegisterFormState,
} from "@/app/events/[slug]/register/actions";
import { ConsentField } from "@/components/forms/ConsentField";
import { PhoneField } from "@/components/forms/PhoneField";

const initialState: RegisterFormState = { ok: false };

const inputClass =
  "w-full border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 outline-none transition-colors focus:border-ink";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
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
      <div className="border border-ink bg-volt p-10 text-center text-ink shadow-[8px_8px_0_0_currentColor]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]">
          Check your inbox
        </p>
        <p className="mx-auto mt-4 max-w-md font-medium text-ink/75">
          We&apos;ve sent an email about your registration for {eventTitle}.
          If this is a new registration, click the link in it to confirm your
          spot — it isn&apos;t reserved until you do.
        </p>
        <Link
          href={`/events/${eventSlug}`}
          className="mt-8 inline-flex items-center border border-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-volt"
        >
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="border border-ink/15 bg-white/95 p-6 backdrop-blur-sm sm:p-8"
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
        <div>
          <label htmlFor="reg-phone" className={labelClass}>
            Phone number *
          </label>
          <PhoneField
            id="reg-phone"
            name="phone"
            required
            invalid={!!state.errors?.phone?.length}
          />
          <FieldError errors={state.errors?.phone} />
        </div>
        <div>
          <label htmlFor="reg-school" className={labelClass}>
            School or institution *
          </label>
          <input
            id="reg-school"
            name="school"
            required
            maxLength={160}
            className={inputClass}
          />
          <FieldError errors={state.errors?.school} />
        </div>
        <div>
          <label htmlFor="reg-city" className={labelClass}>
            City *
          </label>
          <input
            id="reg-city"
            name="city"
            required
            maxLength={120}
            autoComplete="address-level2"
            className={inputClass}
          />
          <FieldError errors={state.errors?.city} />
        </div>
        <div>
          <label htmlFor="reg-country" className={labelClass}>
            Country *
          </label>
          <input
            id="reg-country"
            name="country"
            required
            maxLength={120}
            autoComplete="country-name"
            className={inputClass}
          />
          <FieldError errors={state.errors?.country} />
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

      <ConsentField errors={state.errors?.consent} />

      {state.message && (
        <p className="mt-6 border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 border border-ink bg-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel disabled:opacity-60"
        >
          {pending ? "Registering…" : "Register"}
        </button>
        <Link
          href={`/events/${eventSlug}`}
          className="inline-flex items-center border border-ink/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
