"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  submitMessageAction,
  type ContactFormState,
} from "@/app/contact/actions";
import { INQUIRY_TYPES } from "@/lib/inquiry-types";

const initialState: ContactFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function ContactForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitMessageAction,
    initialState
  );
  const [type, setType] = useState("GENERAL");

  if (state.done) {
    return (
      <div className="border border-volt/40 bg-panel p-10 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Message sent
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Thanks for reaching out — your message is in the inbox and someone
          from the team will get back to you.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-white/10 bg-panel p-6 sm:p-8">
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
            Name *
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
        <div className="sm:col-span-2">
          <label htmlFor="type" className={labelClass}>
            Inquiry category *
          </label>
          <select
            id="type"
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            {INQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.type} />
          {type === "SPEAKER_APPLICATION" && (
            <p className="mt-2 text-xs text-muted">
              Want to apply to speak? Use the{" "}
              <Link href="/speakers/apply" className="text-volt hover:underline">
                dedicated speaker application
              </Link>{" "}
              — or send a general message here if you have questions first.
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="subject" className={labelClass}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            maxLength={200}
            className={inputClass}
            placeholder="A short summary (optional)"
          />
          <FieldError errors={state.errors?.subject} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="message" className={labelClass}>
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={6}
          className={inputClass}
          placeholder="How can we help?"
        />
        <FieldError errors={state.errors?.message} />
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
          className="inline-flex items-center gap-2 bg-volt px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
