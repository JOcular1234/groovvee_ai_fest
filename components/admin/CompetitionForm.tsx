"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  saveCompetitionAction,
  type CompetitionFormState,
} from "@/app/admin/(protected)/competitions/actions";
import { slugify } from "@/lib/slug";
import {
  COMPETITION_KINDS,
  COMPETITION_STATUSES,
} from "@/lib/validation/competition";

export type CompetitionFormValues = {
  id?: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  timezone: string;
  prizeText: string;
  rulesUrl: string;
  imageUrl: string;
  eventId: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

export type EventOption = { id: string; title: string };

const initialState: CompetitionFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

const TIMEZONES: string[] =
  typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function CompetitionForm({
  competition,
  events,
}: {
  competition?: CompetitionFormValues;
  events: EventOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveCompetitionAction,
    initialState
  );
  const [slug, setSlug] = useState(competition?.slug ?? "");
  const slugEdited = useRef(!!competition);
  const slugChanged =
    !!competition && competition.published && slug !== competition.slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          slugChanged &&
          !window.confirm(
            `Changing the slug of a published competition breaks existing links (/competitions/${competition?.slug}). Continue?`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {competition?.id && (
        <input type="hidden" name="id" value={competition.id} />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={competition?.title}
            required
            maxLength={200}
            className={inputClass}
            placeholder="AI Hack Wars"
            onChange={(e) => {
              if (!slugEdited.current) setSlug(slugify(e.target.value));
            }}
          />
          <FieldError errors={state.errors?.title} />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              slugEdited.current = true;
              setSlug(e.target.value.toLowerCase());
            }}
            maxLength={160}
            className={inputClass}
            placeholder="auto-generated from title"
          />
          <p className="mt-1 text-xs text-muted/70">
            Leave blank to auto-generate. Public URL: /competitions/slug
          </p>
          <FieldError errors={state.errors?.slug} />
        </div>
      </div>

      {slugChanged && (
        <p className="mt-4 border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-volt">
          Warning: this competition is published. Changing its slug will break
          existing links.
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className={labelClass}>
            Kind *
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue={competition?.kind ?? "CONTEST"}
            className={inputClass}
          >
            {COMPETITION_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted/70">
            Hack Wars competitions feed the /hack-wars apply form.
          </p>
          <FieldError errors={state.errors?.kind} />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            Status *
          </label>
          <select
            id="status"
            name="status"
            defaultValue={competition?.status ?? "UPCOMING"}
            className={inputClass}
          >
            {COMPETITION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted/70">
            “Registration open” unlocks the public apply form for Hack Wars.
          </p>
          <FieldError errors={state.errors?.status} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={competition?.description}
          required
          maxLength={8000}
          rows={5}
          className={inputClass}
          placeholder="What the competition is, who should enter, what happens."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Starts <span className="normal-case">(competition timezone)</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={competition?.startsAtLocal}
            className={inputClass}
          />
          <FieldError errors={state.errors?.startsAtLocal} />
        </div>
        <div>
          <label htmlFor="endsAt" className={labelClass}>
            Ends
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={competition?.endsAtLocal}
            className={inputClass}
          />
          <FieldError errors={state.errors?.endsAtLocal} />
        </div>
        <div>
          <label htmlFor="timezone" className={labelClass}>
            Timezone *
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={competition?.timezone ?? "UTC"}
            className={inputClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.timezone} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="prizeText" className={labelClass}>
            Prize
          </label>
          <input
            id="prizeText"
            name="prizeText"
            defaultValue={competition?.prizeText}
            maxLength={200}
            className={inputClass}
            placeholder="$10,000 + a GrooVVee production deal"
          />
          <FieldError errors={state.errors?.prizeText} />
        </div>
        <div>
          <label htmlFor="rulesUrl" className={labelClass}>
            Rules URL (https)
          </label>
          <input
            id="rulesUrl"
            name="rulesUrl"
            defaultValue={competition?.rulesUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://…"
          />
          <FieldError errors={state.errors?.rulesUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="imageUrl" className={labelClass}>
            Cover image URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={competition?.imageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/hack-wars.webp"
          />
          <FieldError errors={state.errors?.imageUrl} />
        </div>
        <div>
          <label htmlFor="eventId" className={labelClass}>
            Linked event
          </label>
          <select
            id="eventId"
            name="eventId"
            defaultValue={competition?.eventId ?? ""}
            className={inputClass}
          >
            <option value="">— None —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted/70">
            Shown as “Part of …” on the public page.
          </p>
          <FieldError errors={state.errors?.eventId} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="sortOrder" className={labelClass}>
            Display order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={competition?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
        <label className="flex items-center gap-3 self-end pb-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={competition?.published}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Published
          </span>
        </label>
        <label className="flex items-center gap-3 self-end pb-3">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={competition?.featured}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Featured
          </span>
        </label>
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
          {pending ? "Saving…" : competition ? "Save changes" : "Add competition"}
        </button>
        <Link
          href="/admin/competitions"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
