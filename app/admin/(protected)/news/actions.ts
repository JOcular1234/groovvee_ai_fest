"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { NEWS_CACHE_TAG } from "@/lib/public/news";
import {
  createNewsPost,
  deleteNewsPost,
  setNewsPostPublished,
  updateNewsPost,
} from "@/lib/news";
import { SlugConflictError } from "@/lib/slug";
import { newsPostFormSchema } from "@/lib/validation/news";

export type NewsPostFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type NewsPostActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateNews() {
  updateTag(NEWS_CACHE_TAG);
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

export async function saveNewsPostAction(
  _prev: NewsPostFormState,
  formData: FormData
): Promise<NewsPostFormState> {
  await requireAdmin();

  const parsed = newsPostFormSchema.safeParse({
    title: formData.get("title"),
    slug: String(formData.get("slug") ?? "").trim(),
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    sourceUrl: formData.get("sourceUrl") ?? "",
    authorName: formData.get("authorName") ?? "",
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id) {
      const updated = await withDbRetry(() =>
        updateNewsPost(db, id, parsed.data)
      );
      if (!updated)
        return { ok: false, message: "Post no longer exists." };
    } else {
      await withDbRetry(() => createNewsPost(db, parsed.data));
    }
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return {
        ok: false,
        errors: { slug: [`“${err.slug}” is already in use.`] },
      };
    }
    return { ok: false, message: "Could not save the post. Try again." };
  }

  revalidateNews();
  redirect("/admin/news");
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<NewsPostActionResult> {
  await requireAdmin();
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Post not found." };
    revalidateNews();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteNewsPostAction(
  id: string
): Promise<NewsPostActionResult> {
  return runMutation(() => deleteNewsPost(db, id));
}

export async function setNewsPostPublishedAction(
  id: string,
  published: boolean
): Promise<NewsPostActionResult> {
  return runMutation(() => setNewsPostPublished(db, id, published));
}
