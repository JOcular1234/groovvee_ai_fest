"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  saveTopicAction,
  type TopicFormState,
} from "@/app/admin/(protected)/topics/actions";

export type TopicFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  published: boolean;
  sortOrder: number;
};

const initialState: TopicFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function TopicForm({ topic }: { topic?: TopicFormValues }) {
  const [state, formAction, pending] = useActionState(
    saveTopicAction,
    initialState
  );
  const [slug, setSlug] = useState(topic?.slug ?? "");
  const slugEdited = useRef(!!topic);
  const slugChanged = !!topic && topic.published && slug !== topic.slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          slugChanged &&
          !window.confirm(
            `Changing the slug of a published topic breaks existing links (/topics → ${topic?.slug}). Continue?`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {topic?.id && <input type="hidden" name="id" value={topic.id} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={topic?.title}
            required
            maxLength={160}
            className={inputClass}
            placeholder="Generative AI"
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
            Leave blank to auto-generate.
          </p>
          <FieldError errors={state.errors?.slug} />
        </div>
      </div>

      {slugChanged && (
        <p className="mt-4 border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-volt">
          Warning: this topic is published. Changing its slug will break
          existing links.
        </p>
      )}

      <div className="mt-6">
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={topic?.description}
          required
          maxLength={4000}
          rows={6}
          className={inputClass}
          placeholder="What this topic covers on stage."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="imageUrl" className={labelClass}>
            Image URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={topic?.imageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/topic.webp"
          />
          <FieldError errors={state.errors?.imageUrl} />
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
            defaultValue={topic?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
      </div>

      <label className="mt-6 flex items-center gap-3">
        <input
          type="checkbox"
          name="published"
          defaultChecked={topic?.published}
          className="size-4 accent-volt"
        />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Published
        </span>
      </label>

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
          {pending ? "Saving…" : topic ? "Save changes" : "Add topic"}
        </button>
        <Link
          href="/admin/topics"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
