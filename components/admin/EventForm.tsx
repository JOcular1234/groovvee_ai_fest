"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  saveEventAction,
  type EventFormState,
} from "@/app/admin/(protected)/events/actions";
import { slugify } from "@/lib/slug";
import { EVENT_SOURCES } from "@/lib/validation/event";

export type EventFormValues = {
  id?: string;
  title: string;
  slug: string;
  source: string;
  externalId: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  timezone: string;
  city: string;
  country: string;
  region: string;
  venueName: string;
  isOnline: boolean;
  url: string;
  imageUrl: string;
  communityId: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

export type CommunityOption = { id: string; name: string };

const initialState: EventFormState = { ok: false };

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

export function EventForm({
  event,
  communities,
}: {
  event?: EventFormValues;
  communities: CommunityOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveEventAction,
    initialState
  );
  const [slug, setSlug] = useState(event?.slug ?? "");
  const slugEdited = useRef(!!event);
  const slugChanged = !!event && event.published && slug !== event.slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          slugChanged &&
          !window.confirm(
            `Changing the slug of a published event breaks existing links (/events/${event?.slug}). Continue?`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {event?.id && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={event?.title}
            required
            maxLength={200}
            className={inputClass}
            placeholder="AI Vibe Code Party — Lagos"
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
            Leave blank to auto-generate. Public URL: /events/slug
          </p>
          <FieldError errors={state.errors?.slug} />
        </div>
      </div>

      {slugChanged && (
        <p className="mt-4 border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-volt">
          Warning: this event is published. Changing its slug will break
          existing links.
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Starts * <span className="normal-case">(event timezone)</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={event?.startsAtLocal}
            required
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
            defaultValue={event?.endsAtLocal}
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
            defaultValue={event?.timezone ?? "UTC"}
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

      <div className="mt-6">
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={event?.description}
          required
          maxLength={8000}
          rows={5}
          className={inputClass}
          placeholder="What happens at this event, who it's for, what to bring."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <input
            id="city"
            name="city"
            defaultValue={event?.city}
            maxLength={120}
            className={inputClass}
            placeholder="Lagos"
          />
          <FieldError errors={state.errors?.city} />
        </div>
        <div>
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <input
            id="country"
            name="country"
            defaultValue={event?.country}
            maxLength={120}
            className={inputClass}
            placeholder="Nigeria"
          />
          <FieldError errors={state.errors?.country} />
        </div>
        <div>
          <label htmlFor="region" className={labelClass}>
            Region
          </label>
          <input
            id="region"
            name="region"
            defaultValue={event?.region}
            maxLength={120}
            className={inputClass}
            placeholder="West Africa"
          />
          <FieldError errors={state.errors?.region} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="venueName" className={labelClass}>
            Venue name
          </label>
          <input
            id="venueName"
            name="venueName"
            defaultValue={event?.venueName}
            maxLength={200}
            className={inputClass}
            placeholder="Landmark Event Centre"
          />
          <FieldError errors={state.errors?.venueName} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="communityId" className={labelClass}>
            Host community
          </label>
          <select
            id="communityId"
            name="communityId"
            defaultValue={event?.communityId ?? ""}
            className={inputClass}
          >
            <option value="">— None (GrooVVee-hosted) —</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.communityId} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="url" className={labelClass}>
            Event URL (https)
          </label>
          <input
            id="url"
            name="url"
            defaultValue={event?.url}
            maxLength={500}
            className={inputClass}
            placeholder="https://lu.ma/… or registration link"
          />
          <FieldError errors={state.errors?.url} />
        </div>
        <div>
          <label htmlFor="imageUrl" className={labelClass}>
            Cover image URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={event?.imageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/event.webp"
          />
          <FieldError errors={state.errors?.imageUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="source" className={labelClass}>
            Source *
          </label>
          <select
            id="source"
            name="source"
            defaultValue={event?.source ?? "GROOVVEE"}
            className={inputClass}
          >
            {EVENT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.source} />
        </div>
        <div>
          <label htmlFor="externalId" className={labelClass}>
            External ID
          </label>
          <input
            id="externalId"
            name="externalId"
            defaultValue={event?.externalId}
            maxLength={200}
            className={inputClass}
            placeholder="dedupe key for imports"
          />
          <FieldError errors={state.errors?.externalId} />
        </div>
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
            defaultValue={event?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-8">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isOnline"
            defaultChecked={event?.isOnline}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Online event
          </span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={event?.published}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Published
          </span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={event?.featured}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Featured on homepage
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
          {pending ? "Saving…" : event ? "Save changes" : "Add event"}
        </button>
        <Link
          href="/admin/events"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
