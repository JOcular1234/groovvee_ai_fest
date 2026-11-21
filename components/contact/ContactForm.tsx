"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  submitMessageAction,
  type ContactFormState,
} from "@/app/contact/actions";
import { ConsentField } from "@/components/forms/ConsentField";
import { INQUIRY_TYPES } from "@/lib/inquiry-types";

const initialState: ContactFormState = { ok: false };

const MESSAGE_MAX = 5000;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const inputClass =
  "w-full border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink placeholder:text-ink/40 outline-none transition-colors focus:border-ink aria-invalid:border-red-500";
const labelClass =
  "mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60";

function Required() {
  return (
    <span className="text-ink" aria-hidden>
      *
    </span>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600">
      {errors[0]}
    </p>
  );
}

export function ContactForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitMessageAction,
    initialState
  );

  // Controlled fields — React resets uncontrolled fields after a server-action
  // submission, which would wipe the visitor's message on a validation error.
  const [type, setType] = useState("GENERAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.message && !state.done) {
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [state]);

  if (state.done) {
    return (
      <div
        role="status"
        className="border border-ink bg-volt p-8 text-center text-ink shadow-[8px_8px_0_0_currentColor] sm:p-12"
      >
        <span
          className="mx-auto grid size-14 place-items-center border border-ink bg-ink text-volt"
          aria-hidden
        >
          <Check className="size-7" />
        </span>
        <h2 className="mt-6 font-display text-4xl uppercase leading-none sm:text-5xl">
          Message sent.
        </h2>
        <p className="mx-auto mt-5 max-w-md font-medium text-ink/75">
          Thanks for reaching out
          {name ? `, ${name.split(" ")[0]}` : ""}. Your message is in the inbox
          and someone from the team will get back to you
          {email ? (
            <>
              {" "}
              at <span className="font-semibold text-ink">{email}</span>
            </>
          ) : null}
          .
        </p>
        <Link
          href="/"
          className={`mt-8 inline-flex min-h-12 items-center border border-ink px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-volt ${focusRing}`}
        >
          Back to home
        </Link>
      </div>
    );
  }

  const nearLimit = message.length > MESSAGE_MAX * 0.9;

  return (
    <form
      action={formAction}
      className="relative border border-ink/15 bg-white/95 p-6 backdrop-blur-sm sm:p-8"
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

      {/* Topic */}
      <fieldset>
        <legend className={labelClass}>
          What&apos;s this about? <Required />
        </legend>
        <div className="flex flex-wrap gap-2">
          {INQUIRY_TYPES.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center border border-ink/20 px-4 text-sm text-ink/70 transition-colors hover:border-ink peer-checked:border-ink peer-checked:bg-volt peer-checked:font-semibold peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-volt">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError id="type-error" errors={state.errors?.type} />
        {type === "SPEAKER_APPLICATION" && (
          <div className="mt-4 flex items-start justify-between gap-4 border border-ink/30 bg-volt/70 p-4 text-sm font-medium text-ink">
            <p>
              Want to apply to speak? The dedicated application is the fastest
              route. Or keep going if you have questions first.
            </p>
            <Link
              href="/speakers/apply"
              className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink hover:underline ${focusRing}`}
            >
              Apply
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </fieldset>

      {/* You */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name <Required />
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!state.errors?.name?.length}
            aria-describedby={state.errors?.name?.length ? "name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="name-error" errors={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email <Required />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!state.errors?.email?.length}
            aria-describedby={state.errors?.email?.length ? "email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="email-error" errors={state.errors?.email} />
        </div>
      </div>

      {/* Message */}
      <div className="mt-6">
        <label htmlFor="subject" className={labelClass}>
          Subject
          <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-ink/50">
            optional
          </span>
        </label>
        <input
          id="subject"
          name="subject"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-invalid={!!state.errors?.subject?.length}
          aria-describedby={state.errors?.subject?.length ? "subject-error" : undefined}
          className={inputClass}
          placeholder="A short summary"
        />
        <FieldError id="subject-error" errors={state.errors?.subject} />
      </div>

      <div className="mt-6">
        <label htmlFor="message" className={labelClass}>
          Message <Required />
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={MESSAGE_MAX}
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={!!state.errors?.message?.length}
          aria-describedby={
            state.errors?.message?.length ? "message-error" : "message-count"
          }
          className={`${inputClass} resize-y`}
          placeholder="How can we help?"
        />
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <FieldError id="message-error" errors={state.errors?.message} />
          <p
            id="message-count"
            className={`ml-auto shrink-0 font-mono text-[11px] ${
              nearLimit ? "text-amber-600" : "text-ink/50"
            }`}
          >
            {message.length} / {MESSAGE_MAX}
          </p>
        </div>
      </div>

      <ConsentField errors={state.errors?.consent} />

      {state.message && (
        <p
          ref={alertRef}
          role="alert"
          className="mt-6 border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink/60">
          <span className="font-bold text-ink">*</span> Required
        </p>
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex min-h-12 items-center justify-center gap-2 border border-ink bg-ink px-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel disabled:opacity-60 ${focusRing}`}
        >
          {pending ? (
            <>
              <span
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
              Sending…
            </>
          ) : (
            <>
              Send message
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}