"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  saveNewsPostAction,
  type NewsPostFormState,
} from "@/app/admin/(protected)/news/actions";
import { slugify } from "@/lib/slug";

export type NewsPostFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  sourceUrl: string;
  authorName: string;
  published: boolean;
};

const initialState: NewsPostFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function NewsPostForm({ post }: { post?: NewsPostFormValues }) {
  const [state, formAction, pending] = useActionState(
    saveNewsPostAction,
    initialState
  );
  const [slug, setSlug] = useState(post?.slug ?? "");
  const slugEdited = useRef(!!post);
  const slugChanged = !!post && post.published && slug !== post.slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          slugChanged &&
          !window.confirm(
            `Changing the slug of a published post breaks existing links (/news/${post?.slug}). Continue?`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="border border-white/10 bg-panel p-6 sm:p-8"
    >
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={post?.title}
            required
            maxLength={160}
            className={inputClass}
            placeholder="The headline"
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
            Leave blank to auto-generate. Public URL: /news/slug
          </p>
          <FieldError errors={state.errors?.slug} />
        </div>
      </div>

      {slugChanged && (
        <p className="mt-4 border border-volt/30 bg-volt/10 px-4 py-3 text-sm text-volt">
          Warning: this post is published. Changing its slug will break
          existing links.
        </p>
      )}

      <div className="mt-6">
        <label htmlFor="excerpt" className={labelClass}>
          Excerpt *
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt}
          required
          maxLength={500}
          rows={2}
          className={inputClass}
          placeholder="One or two sentences shown in listings and link previews."
        />
        <FieldError errors={state.errors?.excerpt} />
      </div>

      <div className="mt-6">
        <label htmlFor="body" className={labelClass}>
          Body *
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={post?.body}
          required
          maxLength={20000}
          rows={12}
          className={inputClass}
          placeholder="The full story. Blank lines separate paragraphs."
        />
        <FieldError errors={state.errors?.body} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="coverImageUrl" className={labelClass}>
            Cover image URL
          </label>
          <input
            id="coverImageUrl"
            name="coverImageUrl"
            defaultValue={post?.coverImageUrl}
            maxLength={500}
            className={inputClass}
            placeholder="https://… or /images/post.webp"
          />
          <FieldError errors={state.errors?.coverImageUrl} />
        </div>
        <div>
          <label htmlFor="authorName" className={labelClass}>
            Author
          </label>
          <input
            id="authorName"
            name="authorName"
            defaultValue={post?.authorName}
            maxLength={120}
            className={inputClass}
            placeholder="GrooVVee Newsroom"
          />
          <FieldError errors={state.errors?.authorName} />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="sourceUrl" className={labelClass}>
          Source link (https)
        </label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          defaultValue={post?.sourceUrl}
          maxLength={500}
          className={inputClass}
          placeholder="https://original-story.example/…"
        />
        <p className="mt-1 text-xs text-muted/70">
          For syndicated stories — shown as &quot;Read the original
          story&quot; on the post.
        </p>
        <FieldError errors={state.errors?.sourceUrl} />
      </div>

      <label className="mt-6 flex items-center gap-3">
        <input
          type="checkbox"
          name="published"
          defaultChecked={post?.published}
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
          {pending ? "Saving…" : post ? "Save changes" : "Add post"}
        </button>
        <Link
          href="/admin/news"
          className="inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
