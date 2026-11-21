"use client";

import { ArrowRight, Check, Plus, User, Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  submitHackWarsApplicationAction,
  type HackWarsFormState,
} from "@/app/hack-wars/apply/actions";
import { ConsentField } from "@/components/forms/ConsentField";
import { PhoneField } from "@/components/forms/PhoneField";
import { COMMUNITY_CATEGORIES } from "@/lib/validation/community";

const initialState: HackWarsFormState = { ok: false };

const MAX_MEMBERS = 2; // additional members; leader counts as the third
const INTRO_MAX = 1500;
const EXPERIENCE_MAX = 2000;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const inputClass =
  "w-full border border-ink/20 bg-white px-4 py-3.5 text-sm text-ink placeholder:text-ink/40 outline-none transition-colors focus:border-ink aria-invalid:border-red-500 [color-scheme:light]";
const labelClass =
  "mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60";

type Member = { id: number; name: string; email: string; school: string };

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600">
      {errors[0]}
    </p>
  );
}

function TextField({
  id,
  name,
  label,
  value,
  onChange,
  errors,
  required,
  type = "text",
  maxLength,
  placeholder,
  autoComplete,
  inputMode,
  className,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  errors?: string[];
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  className?: string;
}) {
  const invalid = !!errors?.length;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? (
          <span className="text-ink" aria-hidden>
            *
          </span>
        ) : (
          <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-ink/50">
            optional
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={inputClass}
      />
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <p
      className={`ml-auto shrink-0 font-mono text-[11px] ${
        value > max * 0.9 ? "text-amber-600" : "text-ink/50"
      }`}
    >
      {value} / {max}
    </p>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-ink/15 bg-white/95 backdrop-blur-sm">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink/15 px-6 py-5 sm:px-8">
        <span className="bg-volt px-1.5 py-0.5 font-mono text-xs font-bold text-ink">{step}</span>
        <h2 className="font-display text-2xl uppercase leading-none text-ink sm:text-3xl">
          {title}
        </h2>
        {hint && (
          <p className="w-full text-sm text-ink/60 sm:ml-auto sm:w-auto">{hint}</p>
        )}
      </header>
      <div className="p-6 sm:p-8">{children}</div>
    </section>
  );
}

const PARTICIPATION = [
  {
    value: "individual" as const,
    title: "Individual",
    desc: "Compete solo",
    Icon: User,
  },
  {
    value: "team" as const,
    title: "Team",
    desc: "2-3 people, including you",
    Icon: Users,
  },
];

export function HackWarsApplyForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitHackWarsApplicationAction,
    initialState
  );

  // Every field is controlled: React resets uncontrolled fields after a
  // server-action submission, which would wipe a long application on any
  // validation error.
  const [participation, setParticipation] = useState<"individual" | "team">(
    "individual"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [sector, setSector] = useState("");
  const [intro, setIntro] = useState("");
  const [experience, setExperience] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<Member[]>([
    { id: 0, name: "", email: "", school: "" },
  ]);
  const nextId = useRef(1);

  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.message && !state.done) {
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [state]);

  const updateMember = (id: number, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

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
          Application received.
        </h2>
        <p className="mx-auto mt-5 max-w-md font-medium text-ink/75">
          Your AI Hack Wars entry is in. The organizing team reviews every
          application and will reach out with next steps
          {email ? (
            <>
              {" "}
              at <span className="font-semibold text-ink">{email}</span>
            </>
          ) : null}
          .
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/competitions"
            className={`inline-flex min-h-12 items-center border border-ink bg-ink px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel ${focusRing}`}
          >
            See competitions
          </Link>
          <Link
            href="/"
            className={`inline-flex min-h-12 items-center border border-ink px-7 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-volt ${focusRing}`}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // numbered section headers, in render order
  let n = 0;
  const step = () => String(++n).padStart(2, "0");
  const teamSize = members.length + 1;

  return (
    <form action={formAction} className="relative space-y-6">
      <input type="hidden" name="started" value={token} />
      {/* Honeypot — invisible to humans, tempting to bots. Nonstandard name
          prevents browser autofill from populating it for real users. */}
      <div className="absolute -left-250" aria-hidden="true">
        <label>
          Website
          <input name="gvf_extra" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* 01 — participation */}
      <Section step={step()} title="How will you compete?">
        <fieldset>
          <legend className="sr-only">Participation type</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PARTICIPATION.map(({ value, title, desc, Icon }) => {
              const selected = participation === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-4 border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt ${
                    selected
                      ? "border-ink bg-volt"
                      : "border-ink/20 bg-white/80 hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="participation"
                    value={value}
                    checked={selected}
                    onChange={() => setParticipation(value)}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-11 shrink-0 place-items-center ${
                      selected ? "bg-ink text-volt" : "border border-ink/20 text-ink"
                    }`}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-display text-xl uppercase leading-none text-ink">
                      {title}
                    </span>
                    <span className="mt-1.5 block text-sm text-ink/70">{desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="participation-error" errors={state.errors?.participation} />
        </fieldset>
      </Section>

      {/* 02 — about you */}
      <Section
        step={step()}
        title="About you"
        hint={participation === "team" ? "You're the team leader." : undefined}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id="name"
            name="name"
            label="Full name"
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={setName}
            errors={state.errors?.name}
          />
          <TextField
            id="email"
            name="email"
            label="Email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            value={email}
            onChange={setEmail}
            errors={state.errors?.email}
          />
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone number
              <span className="text-ink" aria-hidden>
                *
              </span>
            </label>
            <PhoneField
              id="phone"
              name="phone"
              required
              value={phone}
              onChange={setPhone}
              invalid={!!state.errors?.phone?.length}
              errorId={state.errors?.phone?.length ? "phone-error" : undefined}
            />
            <FieldError id="phone-error" errors={state.errors?.phone} />
          </div>
          <TextField
            id="school"
            name="school"
            label="School or institution"
            required
            maxLength={160}
            autoComplete="organization"
            value={school}
            onChange={setSchool}
            errors={state.errors?.school}
          />
          <TextField
            id="major"
            name="major"
            label="Major / field of study"
            maxLength={160}
            value={major}
            onChange={setMajor}
            errors={state.errors?.major}
          />
          <TextField
            id="gradYear"
            name="gradYear"
            label="Expected graduation year"
            maxLength={10}
            placeholder="e.g. 2027"
            inputMode="numeric"
            value={gradYear}
            onChange={setGradYear}
            errors={state.errors?.gradYear}
          />
          <div className="sm:col-span-2">
            <label htmlFor="sector" className={labelClass}>
              Industry / sector you&apos;ll compete in
              <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-ink/50">
                optional
              </span>
            </label>
            <select
              id="sector"
              name="sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              aria-invalid={!!state.errors?.sector?.length}
              aria-describedby={state.errors?.sector?.length ? "sector-error" : undefined}
              className={inputClass}
            >
              <option value="">Undecided / not listed</option>
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label.replace(/^AI /, "")}
                </option>
              ))}
            </select>
            <FieldError id="sector-error" errors={state.errors?.sector} />
          </div>
        </div>
      </Section>

      {/* 03 — pitch */}
      <Section
        step={step()}
        title="Your story"
        hint="Help the organizers get to know you."
      >
        <div>
          <label htmlFor="intro" className={labelClass}>
            Introduction
            <span className="text-ink" aria-hidden>
              *
            </span>
          </label>
          <p id="intro-help" className="-mt-1 mb-2 text-sm text-ink/60">
            Who are you, in about four sentences?
          </p>
          <textarea
            id="intro"
            name="intro"
            required
            maxLength={INTRO_MAX}
            rows={5}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            aria-invalid={!!state.errors?.intro?.length}
            aria-describedby={`intro-help${state.errors?.intro?.length ? " intro-error" : ""}`}
            className={`${inputClass} resize-y`}
            placeholder="What you build, what drives you, and why you want to compete."
          />
          <div className="mt-1.5 flex items-start gap-4">
            <FieldError id="intro-error" errors={state.errors?.intro} />
            <Counter value={intro.length} max={INTRO_MAX} />
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="previousExperience" className={labelClass}>
            Previous TV competition or contest experience
            <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-ink/50">
              optional
            </span>
          </label>
          <textarea
            id="previousExperience"
            name="previousExperience"
            maxLength={EXPERIENCE_MAX}
            rows={4}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            aria-invalid={!!state.errors?.previousExperience?.length}
            aria-describedby={
              state.errors?.previousExperience?.length
                ? "previousExperience-error"
                : undefined
            }
            className={`${inputClass} resize-y`}
            placeholder="Hackathons, game jams, competitions."
          />
          <div className="mt-1.5 flex items-start gap-4">
            <FieldError
              id="previousExperience-error"
              errors={state.errors?.previousExperience}
            />
            <Counter value={experience.length} max={EXPERIENCE_MAX} />
          </div>
        </div>
      </Section>

      {/* 04 — team (only when competing as a team) */}
      {participation === "team" && (
        <Section
          step={step()}
          title="Your team"
          hint={`Team size: ${teamSize} of ${MAX_MEMBERS + 1}`}
        >
          <TextField
            id="teamName"
            name="teamName"
            label="Team name"
            required
            maxLength={80}
            value={teamName}
            onChange={setTeamName}
            errors={state.errors?.teamName}
          />

          <ul className="mt-6 space-y-4">
            {members.map((m, i) => (
              <li key={m.id} className="border border-ink/15 bg-white/80 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-display text-xl uppercase leading-none text-ink">
                    Teammate {i + 1}
                  </p>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMembers((ms) => ms.filter((x) => x.id !== m.id))
                      }
                      aria-label={`Remove teammate ${i + 1}`}
                      className={`inline-flex min-h-9 items-center px-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink/60 transition-colors hover:text-red-600 ${focusRing}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    id={`member-name-${m.id}`}
                    name={`member_name_${i}`}
                    label="Full name"
                    required
                    maxLength={120}
                    value={m.name}
                    onChange={(v) => updateMember(m.id, { name: v })}
                  />
                  <TextField
                    id={`member-email-${m.id}`}
                    name={`member_email_${i}`}
                    label="Email"
                    type="email"
                    required
                    maxLength={320}
                    value={m.email}
                    onChange={(v) => updateMember(m.id, { email: v })}
                  />
                  <TextField
                    id={`member-school-${m.id}`}
                    name={`member_school_${i}`}
                    label="School / institution"
                    maxLength={160}
                    value={m.school}
                    onChange={(v) => updateMember(m.id, { school: v })}
                    className="sm:col-span-2"
                  />
                </div>
              </li>
            ))}
          </ul>
          <FieldError id="members-error" errors={state.errors?.members} />

          {members.length < MAX_MEMBERS && (
            <button
              type="button"
              onClick={() =>
                setMembers((ms) => [
                  ...ms,
                  { id: nextId.current++, name: "", email: "", school: "" },
                ])
              }
              className={`mt-4 inline-flex min-h-11 items-center gap-2 border border-dashed border-ink/30 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink transition-colors hover:border-ink hover:bg-volt ${focusRing}`}
            >
              <Plus className="size-4" aria-hidden />
              Add teammate
            </button>
          )}
        </Section>
      )}

      {/* consent */}
      <Section step={step()} title="Confirm">
        <ConsentField
          errors={state.errors?.consent}
          extra="I confirm that I am 16 or older, and "
        />

        {state.message && (
          <p
            ref={alertRef}
            role="alert"
            className="mt-6 border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {state.message}
          </p>
        )}
      </Section>

      {/* Floating action bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 border border-ink/20 bg-white/95 p-4 backdrop-blur">
        <Link
          href="/competitions"
          className={`inline-flex min-h-11 items-center px-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-ink ${focusRing}`}
        >
          Cancel
        </Link>
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
              Submitting…
            </>
          ) : (
            <>
              Submit application
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}