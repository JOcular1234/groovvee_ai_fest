"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  saveAgendaItemAction,
  type AgendaFormState,
} from "@/app/admin/(protected)/agenda/actions";
import { SESSION_TYPES } from "@/lib/validation/agenda";

export type AgendaFormValues = {
  id?: string;
  title: string;
  description: string;
  type: string;
  startsAtLocal: string;
  endsAtLocal: string;
  location: string;
  eventId: string;
  speakerIds: string[];
  published: boolean;
  sortOrder: number;
};

export type AgendaEventOption = {
  id: string;
  title: string;
  published: boolean;
  timezone: string;
};

export type AgendaSpeakerOption = {
  id: string;
  name: string;
  organization: string;
};

const initialState: AgendaFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function AgendaForm({
  item,
  events,
  speakers,
}: {
  item?: AgendaFormValues;
  events: AgendaEventOption[];
  speakers: AgendaSpeakerOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveAgendaItemAction,
    initialState
  );
  const [eventId, setEventId] = useState(item?.eventId ?? "");
  const selectedTz =
    events.find((e) => e.id === eventId)?.timezone ?? "UTC";

  return (
    <form
      action={formAction}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {item?.id && <input type="hidden" name="id" value={item.id} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={item?.title}
            required
            maxLength={200}
            className={inputClass}
            placeholder="Opening keynote"
          />
          <FieldError errors={state.errors?.title} />
        </div>
        <div>
          <label htmlFor="type" className={labelClass}>
            Session type *
          </label>
          <select
            id="type"
            name="type"
            defaultValue={item?.type ?? "TALK"}
            className={inputClass}
          >
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.type} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={item?.description}
          required
          maxLength={4000}
          rows={4}
          className={inputClass}
          placeholder="What this session covers."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="eventId" className={labelClass}>
            Event (optional)
          </label>
          <select
            id="eventId"
            name="eventId"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Unlinked session —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.published ? "" : " (unpublished)"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted/70">
            Session times are entered in the event&apos;s timezone — currently{" "}
            <span className="text-white">{selectedTz}</span>.
          </p>
          <FieldError errors={state.errors?.eventId} />
        </div>
        <div>
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={item?.location}
            maxLength={200}
            className={inputClass}
            placeholder="Main stage · Hall B"
          />
          <FieldError errors={state.errors?.location} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Starts * <span className="normal-case">({selectedTz})</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={item?.startsAtLocal}
            required
            className={inputClass}
          />
          <FieldError errors={state.errors?.startsAtLocal} />
        </div>
        <div>
          <label htmlFor="endsAt" className={labelClass}>
            Ends * <span className="normal-case">({selectedTz})</span>
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={item?.endsAtLocal}
            required
            className={inputClass}
          />
          <FieldError errors={state.errors?.endsAtLocal} />
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
            defaultValue={item?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className={labelClass}>Speakers</legend>
        {speakers.length === 0 ? (
          <p className="text-xs text-muted">
            No speakers yet — add them under Speakers first.
          </p>
        ) : (
          <div className="grid max-h-56 gap-2 overflow-y-auto border border-white/10 bg-ink p-4 sm:grid-cols-2">
            {speakers.map((s) => (
              <label key={s.id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="speakerIds"
                  value={s.id}
                  defaultChecked={item?.speakerIds.includes(s.id)}
                  className="size-4 shrink-0 accent-volt"
                />
                <span className="text-white">{s.name}</span>
                <span className="truncate text-xs text-muted">
                  {s.organization}
                </span>
              </label>
            ))}
          </div>
        )}
        <FieldError errors={state.errors?.speakerIds} />
      </fieldset>

      <div className="mt-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={item?.published}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Published
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
          {pending ? "Saving…" : item ? "Save changes" : "Add session"}
        </button>
        <Link
          href="/admin/agenda"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
