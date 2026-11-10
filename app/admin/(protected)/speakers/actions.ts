"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { AGENDA_CACHE_TAG } from "@/lib/public/agenda";
import { SPEAKERS_CACHE_TAG } from "@/lib/public/speakers";
import {
  createSpeaker,
  deleteSpeaker,
  moveSpeaker,
  setSpeakerFeatured,
  setSpeakerPublished,
  updateSpeaker,
} from "@/lib/speakers";
import {
  SOCIAL_PLATFORMS,
  speakerInputSchema,
} from "@/lib/validation/speaker";

// Server actions automatically verify Origin/Host — CSRF is handled by the
// framework; requireAdmin() checks the live DB session on every call.

export type SpeakerFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type SpeakerActionResult = { ok: true } | { ok: false; message: string };

function revalidateSpeakers() {
  revalidateTag(SPEAKERS_CACHE_TAG, "max");
  // Speaker names render inside event programmes, so agenda cache goes too.
  revalidateTag(AGENDA_CACHE_TAG, "max");
  revalidatePath("/admin/speakers");
  revalidatePath("/speakers");
  revalidatePath("/");
}

export async function saveSpeakerAction(
  _prev: SpeakerFormState,
  formData: FormData
): Promise<SpeakerFormState> {
  await requireAdmin();

  const socials = SOCIAL_PLATFORMS.map((label) => ({
    label,
    url: String(formData.get(`social-${label}`) ?? "").trim(),
  })).filter((s) => s.url !== "");

  const parsed = speakerInputSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title") ?? "",
    organization: formData.get("organization") ?? "",
    bio: formData.get("bio") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    socials,
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
        updateSpeaker(db, id, parsed.data)
      );
      if (!updated) return { ok: false, message: "Speaker no longer exists." };
    } else {
      await withDbRetry(() => createSpeaker(db, parsed.data));
    }
  } catch {
    return { ok: false, message: "Could not save the speaker. Try again." };
  }

  revalidateSpeakers();
  redirect("/admin/speakers");
}

async function runMutation(fn: () => Promise<unknown>): Promise<SpeakerActionResult> {
  await requireAdmin();
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Speaker not found." };
    revalidateSpeakers();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteSpeakerAction(id: string): Promise<SpeakerActionResult> {
  return runMutation(() => deleteSpeaker(db, id));
}

export async function setPublishedAction(
  id: string,
  published: boolean
): Promise<SpeakerActionResult> {
  return runMutation(() => setSpeakerPublished(db, id, published));
}

export async function setFeaturedAction(
  id: string,
  featured: boolean
): Promise<SpeakerActionResult> {
  return runMutation(() => setSpeakerFeatured(db, id, featured));
}

export async function moveSpeakerAction(
  id: string,
  direction: -1 | 1
): Promise<SpeakerActionResult> {
  return runMutation(() => moveSpeaker(db, id, direction));
}
