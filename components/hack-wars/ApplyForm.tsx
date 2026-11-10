"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  submitHackWarsApplicationAction,
  type HackWarsFormState,
} from "@/app/hack-wars/apply/actions";

const initialState: HackWarsFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

const MAX_MEMBERS = 2; // additional members; leader counts as the third

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function HackWarsApplyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitHackWarsApplicationAction,
    initialState
  );
  const [participation, setParticipation] = useState<"individual" | "team">(
    "individual"
  );
  const [members, setMembers] = useState([{ name: "", email: "", school: "" }]);

  if (state.done) {
    return (
      <div className="border border-volt/40 bg-panel p-10 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Application received
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Your AI Hack Wars entry is in. The organizing team reviews every
          application and will reach out with next steps.
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
      <input type="hidden" name="participation" value={participation} />
      {/* Honeypot — invisible to humans, tempting to bots. Nonstandard name
          prevents browser autofill from populating it for real users. */}
      <div className="absolute -left-250" aria-hidden="true">
        <label>
          Website
          <input name="gvf_extra" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend className={labelClass}>Participation type *</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "individual",
                title: "Individual",
                desc: "Compete solo",
              },
              {
                value: "team",
                title: "Team",
                desc: "2-3 people, including you",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={participation === opt.value}
              onClick={() => setParticipation(opt.value)}
              className={`border px-4 py-4 text-left transition-colors ${
                participation === opt.value
                  ? "border-volt bg-volt/10"
                  : "border-white/15 hover:border-volt/50"
              }`}
            >
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white">
                {opt.title}
              </p>
              <p className="mt-1 text-xs text-muted">{opt.desc}</p>
            </button>
          ))}
        </div>
        <FieldError errors={state.errors?.participation} />
      </fieldset>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
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
          <label htmlFor="phone" className={labelClass}>
            Phone number *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={30}
            placeholder="+234 …"
            className={inputClass}
          />
          <FieldError errors={state.errors?.phone} />
        </div>
        <div>
          <label htmlFor="school" className={labelClass}>
            School or institution *
          </label>
          <input
            id="school"
            name="school"
            required
            maxLength={160}
            className={inputClass}
          />
          <FieldError errors={state.errors?.school} />
        </div>
        <div>
          <label htmlFor="major" className={labelClass}>
            Major / field of study
          </label>
          <input
            id="major"
            name="major"
            maxLength={160}
            className={inputClass}
          />
          <FieldError errors={state.errors?.major} />
        </div>
        <div>
          <label htmlFor="gradYear" className={labelClass}>
            Expected graduation year
          </label>
          <input
            id="gradYear"
            name="gradYear"
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 2027"
            className={inputClass}
          />
          <FieldError errors={state.errors?.gradYear} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="intro" className={labelClass}>
          Introduction * — who are you, in about four sentences?
        </label>
        <textarea
          id="intro"
          name="intro"
          required
          maxLength={1500}
          rows={4}
          className={inputClass}
          placeholder="What you build, what drives you, and why you want to compete."
        />
        <FieldError errors={state.errors?.intro} />
      </div>

      <div className="mt-6">
        <label htmlFor="previousExperience" className={labelClass}>
          Previous TV competition or contest experience
        </label>
        <textarea
          id="previousExperience"
          name="previousExperience"
          maxLength={2000}
          rows={3}
          className={inputClass}
          placeholder="Hackathons, game jams, competitions — optional."
        />
        <FieldError errors={state.errors?.previousExperience} />
      </div>

      {participation === "team" && (
        <fieldset className="mt-8 border-t border-white/10 pt-6">
          <legend className={`${labelClass} px-0`}>Team details</legend>

          <div className="mt-4">
            <label htmlFor="teamName" className={labelClass}>
              Team name *
            </label>
            <input
              id="teamName"
              name="teamName"
              required
              maxLength={80}
              className={inputClass}
            />
            <FieldError errors={state.errors?.teamName} />
          </div>

          <div className="mt-6 space-y-4">
            {members.map((m, i) => (
              <div
                key={i}
                className="border border-white/10 bg-ink/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    Member {i + 2}
                  </p>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMembers(members.filter((_, j) => j !== i))
                      }
                      className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    name={`member_name_${i}`}
                    defaultValue={m.name}
                    maxLength={120}
                    placeholder="Full name *"
                    required
                    className={inputClass}
                  />
                  <input
                    name={`member_email_${i}`}
                    type="email"
                    defaultValue={m.email}
                    maxLength={320}
                    placeholder="Email *"
                    required
                    className={inputClass}
                  />
                  <input
                    name={`member_school_${i}`}
                    defaultValue={m.school}
                    maxLength={160}
                    placeholder="School / institution"
                    className={`${inputClass} sm:col-span-2`}
                  />
                </div>
              </div>
            ))}
          </div>

          {members.length < MAX_MEMBERS && (
            <button
              type="button"
              onClick={() =>
                setMembers([...members, { name: "", email: "", school: "" }])
              }
              className="mt-4 border border-white/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt"
            >
              + Add member (max 3 total)
            </button>
          )}
          <FieldError errors={state.errors?.members} />
        </fieldset>
      )}

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
          href="/competitions"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
