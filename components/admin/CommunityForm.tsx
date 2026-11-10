"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  saveCommunityAction,
  type CommunityFormState,
} from "@/app/admin/(protected)/communities/actions";
import { slugify } from "@/lib/slug";
import { COMMUNITY_TYPES } from "@/lib/validation/community";

export type CommunityFormValues = {
  id?: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  imageUrl: string;
  city: string;
  country: string;
  joinUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
};

const initialState: CommunityFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function CommunityForm({
  community,
}: {
  community?: CommunityFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    saveCommunityAction,
    initialState
  );
  const [slug, setSlug] = useState(community?.slug ?? "");
  const slugEdited = useRef(!!community);
  const slugChanged =
    !!community && community.published && slug !== community.slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          slugChanged &&
          !window.confirm(
            `Changing the slug of a published community breaks existing links (/communities/${community?.slug}). Continue?`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {community?.id && (
        <input type="hidden" name="id" value={community.id} />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name *
          </label>
          <input
            id="name"
            name="name"
            defaultValue={community?.name}
            required
            maxLength={160}
            className={inputClass}
            placeholder="Lagos AI Builders"
            onChange={(e) => {
              if (!slugEdited.current) setSlug(slugify(e.target.value));
            }}
          />
          <FieldError errors={state.errors?.name} />
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
            placeholder="auto-generated from name"
          />
          <p className="mt-1 text-xs text-muted/70">
            Leave blank to auto-generate. Public URL: /communities/slug
          </p>
          <FieldError errors={state.errors?.slug} />
        </div>
      </div>

      {slugChanged && (
        <p className="mt-4 border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-volt">
          Warning: this community is published. Changing its slug will break
          existing links.
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={labelClass}>
            Type *
          </label>
          <select
            id="type"
            name="type"
            defaultValue={community?.type ?? "INDUSTRY"}
            className={inputClass}
          >
            {COMMUNITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.type} />
        </div>
        <div>
          <label htmlFor="imageUrl" className={labelClass}>
            Image URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={community?.imageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/community.webp"
          />
          <FieldError errors={state.errors?.imageUrl} />
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <input
            id="city"
            name="city"
            defaultValue={community?.city}
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
            defaultValue={community?.country}
            maxLength={120}
            className={inputClass}
            placeholder="Nigeria"
          />
          <FieldError errors={state.errors?.country} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={community?.description}
          required
          maxLength={4000}
          rows={5}
          className={inputClass}
          placeholder="Who this community is for and what happens there."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="joinUrl" className={labelClass}>
            Join link (https)
          </label>
          <input
            id="joinUrl"
            name="joinUrl"
            defaultValue={community?.joinUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://discord.gg/…"
          />
          <FieldError errors={state.errors?.joinUrl} />
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
            defaultValue={community?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={community?.published}
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
            defaultChecked={community?.featured}
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
          {pending ? "Saving…" : community ? "Save changes" : "Add community"}
        </button>
        <Link
          href="/admin/communities"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
