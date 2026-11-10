"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  saveSpeakerAction,
  type SpeakerFormState,
} from "@/app/admin/(protected)/speakers/actions";
import { SOCIAL_PLATFORMS } from "@/lib/validation/speaker";

export type SpeakerFormValues = {
  id?: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  imageUrl: string;
  socials: { label: string; url: string }[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

const initialState: SpeakerFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function SpeakerForm({ speaker }: { speaker?: SpeakerFormValues }) {
  const [state, formAction, pending] = useActionState(
    saveSpeakerAction,
    initialState
  );

  const socialByLabel = new Map(
    (speaker?.socials ?? []).map((s) => [s.label, s.url])
  );

  return (
    <form
      action={formAction}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {speaker?.id && <input type="hidden" name="id" value={speaker.id} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Full name *
          </label>
          <input
            id="name"
            name="name"
            defaultValue={speaker?.name}
            required
            maxLength={120}
            className={inputClass}
            placeholder="Ada Lovelace"
          />
          <FieldError errors={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="title" className={labelClass}>
            Professional title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={speaker?.title}
            maxLength={160}
            className={inputClass}
            placeholder="Machine Learning Engineer"
          />
          <FieldError errors={state.errors?.title} />
        </div>
        <div>
          <label htmlFor="organization" className={labelClass}>
            Organization
          </label>
          <input
            id="organization"
            name="organization"
            defaultValue={speaker?.organization}
            maxLength={160}
            className={inputClass}
            placeholder="Company or institution"
          />
          <FieldError errors={state.errors?.organization} />
        </div>
        <div>
          <label htmlFor="imageUrl" className={labelClass}>
            Profile image URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={speaker?.imageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/speaker.webp"
          />
          <FieldError errors={state.errors?.imageUrl} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="bio" className={labelClass}>
          Biography
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={speaker?.bio}
          maxLength={4000}
          rows={5}
          className={inputClass}
          placeholder="Short speaker bio shown on the public site."
        />
        <FieldError errors={state.errors?.bio} />
      </div>

      <fieldset className="mt-6">
        <legend className={labelClass}>Social links (https only)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((label) => (
            <div key={label}>
              <label
                htmlFor={`social-${label}`}
                className="mb-1 block text-xs text-muted"
              >
                {label}
              </label>
              <input
                id={`social-${label}`}
                name={`social-${label}`}
                defaultValue={socialByLabel.get(label)}
                maxLength={500}
                className={inputClass}
                placeholder={`https://…`}
              />
            </div>
          ))}
        </div>
        <FieldError errors={state.errors?.socials} />
      </fieldset>

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
            defaultValue={speaker?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
        <label className="flex items-end gap-3 pb-1">
          <input
            type="checkbox"
            name="published"
            defaultChecked={speaker?.published}
            className="size-4 accent-volt"
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Published
          </span>
        </label>
        <label className="flex items-end gap-3 pb-1">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={speaker?.featured}
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
          {pending ? "Saving…" : speaker ? "Save changes" : "Add speaker"}
        </button>
        <Link
          href="/admin/speakers"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
