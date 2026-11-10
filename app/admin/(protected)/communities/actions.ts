"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { COMMUNITIES_CACHE_TAG } from "@/lib/public/communities";
import {
  createCommunity,
  deleteCommunity,
  moveCommunity,
  setCommunityFeatured,
  setCommunityPublished,
  updateCommunity,
} from "@/lib/communities";
import { SlugConflictError } from "@/lib/slug";
import { communityFormSchema } from "@/lib/validation/community";

export type CommunityFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type CommunityActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateCommunities() {
  revalidateTag(COMMUNITIES_CACHE_TAG, "max");
  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath("/");
}

export async function saveCommunityAction(
  _prev: CommunityFormState,
  formData: FormData
): Promise<CommunityFormState> {
  await requireAdmin();

  const parsed = communityFormSchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? "").trim(),
    type: formData.get("type"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    city: formData.get("city") ?? "",
    country: formData.get("country") ?? "",
    joinUrl: formData.get("joinUrl") ?? "",
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const id = formData.get("id");
  try {
    if (typeof id === "string" && id) {
      const updated = await withDbRetry(() =>
        updateCommunity(db, id, parsed.data)
      );
      if (!updated)
        return { ok: false, message: "Community no longer exists." };
    } else {
      await withDbRetry(() => createCommunity(db, parsed.data));
    }
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return {
        ok: false,
        errors: { slug: [`“${err.slug}” is already in use.`] },
      };
    }
    return { ok: false, message: "Could not save the community. Try again." };
  }

  revalidateCommunities();
  redirect("/admin/communities");
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<CommunityActionResult> {
  await requireAdmin();
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Community not found." };
    revalidateCommunities();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteCommunityAction(
  id: string
): Promise<CommunityActionResult> {
  return runMutation(() => deleteCommunity(db, id));
}

export async function setCommunityPublishedAction(
  id: string,
  published: boolean
): Promise<CommunityActionResult> {
  return runMutation(() => setCommunityPublished(db, id, published));
}

export async function setCommunityFeaturedAction(
  id: string,
  featured: boolean
): Promise<CommunityActionResult> {
  return runMutation(() => setCommunityFeatured(db, id, featured));
}

export async function moveCommunityAction(
  id: string,
  direction: -1 | 1
): Promise<CommunityActionResult> {
  return runMutation(() => moveCommunity(db, id, direction));
}
