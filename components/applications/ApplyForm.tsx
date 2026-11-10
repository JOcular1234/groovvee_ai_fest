"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  submitApplicationAction,
  type ApplyFormState,
} from "@/app/speakers/apply/actions";

const initialState: ApplyFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function ApplyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitApplicationAction,
    initialState
  );
  const [links, setLinks] = useState([{ label: "", url: "" }]);

  if (state.done) {
    return (
      <div className="border border-volt/40 bg-panel p-10 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Application received
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Thanks for applying. The curation team reviews every application and
          will reach out if it&apos;s a fit.
        </p>
        <Link
          href="/speakers"
          className="mt-8 inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Back to speakers
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-white/10 bg-panel p-6 sm:p-8">
      <input type="hidden" name="started" value={token} />
      {/* Honeypot — invisible to humans, tempting to bots. */}
      <div className="absolute -left-250" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
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
                className="border border-white/15 px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted transition-colors hover:border-red-400 hover:text-red-400"
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
            className="mt-3 border border-white/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt"
          >
            + Add link
          </button>
        )}
        <FieldError errors={state.errors?.links} />
      </fieldset>

      {state.message && (
        <p className="mt-6 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-volt px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
        <Link
          href="/speakers"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
