"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  submitApplicationAction,
  type ApplyFormState,
} from "@/app/speakers/apply/actions";
import { ConsentField } from "@/components/forms/ConsentField";

const initialState: ApplyFormState = { ok: false };

const inputClass =
  "w-full border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 outline-none transition-colors focus:border-ink";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function ApplyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitApplicationAction,
    initialState
  );
  const [links, setLinks] = useState([{ label: "", url: "" }]);

  if (state.done) {
    return (
      <div className="border border-ink bg-volt p-10 text-center text-ink shadow-[8px_8px_0_0_currentColor]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]">
          Application received
        </p>
        <p className="mx-auto mt-4 max-w-md font-medium text-ink/75">
          Thanks for applying. The curation team reviews every application and
          will reach out if it&apos;s a fit.
        </p>
        <Link
          href="/speakers"
          className="mt-8 inline-flex items-center border border-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-volt"
        >
          Back to speakers
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-ink/15 bg-white/95 p-6 backdrop-blur-sm sm:p-8">
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
          <label htmlFor="name" className={labelClass}>
            Full name *
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            className={inputClass}
          />
          <FieldError errors={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
            className={inputClass}
          />
          <FieldError errors={state.errors?.email} />
        </div>
        <div>
          <label htmlFor="organization" className={labelClass}>
            Organization
          </label>
          <input
            id="organization"
            name="organization"
            maxLength={160}
            className={inputClass}
          />
          <FieldError errors={state.errors?.organization} />
        </div>
        <div>
          <label htmlFor="talkTitle" className={labelClass}>
            Proposed talk title
          </label>
          <input
            id="talkTitle"
            name="talkTitle"
            maxLength={200}
            className={inputClass}
          />
          <FieldError errors={state.errors?.talkTitle} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="bio" className={labelClass}>
          Bio *
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          maxLength={4000}
          rows={5}
          className={inputClass}
          placeholder="Who you are, what you work on, and what you'd bring to the stage."
        />
        <FieldError errors={state.errors?.bio} />
      </div>

      <fieldset className="mt-6">
        <legend className={labelClass}>Links (up to 8)</legend>
        <div className="space-y-3">
          {links.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input
                name={`link_label_${i}`}
                defaultValue={l.label}
                maxLength={30}
                placeholder="Label (e.g. LinkedIn)"
                className={inputClass}
              />
              <input
                name={`link_url_${i}`}
                defaultValue={l.url}
                maxLength={500}
                placeholder="https://…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                className="border border-ink/20 px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/60 transition-colors hover:border-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {links.length < 8 && (
          <button
            type="button"
            onClick={() => setLinks([...links, { label: "", url: "" }])}
            className="mt-3 border border-ink/20 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink/60 transition-colors hover:border-ink hover:bg-volt hover:text-ink"
          >
            + Add link
          </button>
        )}
        <FieldError errors={state.errors?.links} />
      </fieldset>

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
          className="inline-flex items-center gap-2 border border-ink bg-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
        <Link
          href="/speakers"
          className="inline-flex items-center border border-ink/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
