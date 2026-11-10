"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  getApplicationById,
  INVALID_TRANSITION,
  promoteApplicationToSpeaker,
  setApplicationStatus,
  updateApplicationNotes,
} from "@/lib/applications";
import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { SPEAKERS_CACHE_TAG } from "@/lib/public/speakers";
import {
  reviewNotesSchema,
  reviewStatusSchema,
} from "@/lib/validation/application";

export type ApplicationActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateApplications(id?: string) {
  revalidatePath("/admin/applications");
  if (id) revalidatePath(`/admin/applications/${id}`);
}

export async function setApplicationStatusAction(
  id: string,
  status: string
): Promise<ApplicationActionResult> {
  const admin = await requireAdmin();
  const parsed = reviewStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "Invalid status." };
  try {
    const result = await withDbRetry(() =>
      setApplicationStatus(db, id, admin.id, parsed.data)
    );
    if (!result) return { ok: false, message: "Application not found." };
    revalidateApplications(id);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_TRANSITION) {
      return { ok: false, message: "That status change is not allowed." };
    }
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function updateApplicationNotesAction(
  id: string,
  notes: string
): Promise<ApplicationActionResult> {
  const admin = await requireAdmin();
  const parsed = reviewNotesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, message: "Notes are too long." };
  const result = await withDbRetry(() =>
    updateApplicationNotes(db, id, admin.id, parsed.data || null)
  );
  if (!result) return { ok: false, message: "Application not found." };
  revalidateApplications(id);
  return { ok: true };
}

// Redirects are intentionally not caught — success navigates to the speaker.
export async function promoteApplicationAction(id: string): Promise<never> {
  await requireAdmin();
  let speakerId: string;
  try {
    speakerId = await withDbRetry(() => promoteApplicationToSpeaker(db, id));
  } catch (err) {
    if (err instanceof Error && err.message === "already_promoted") {
      // A concurrent promote won — reuse the winner's speaker.
      const app = await withDbRetry(() => getApplicationById(db, id));
      if (app?.speakerId) redirect(`/admin/speakers/${app.speakerId}/edit`);
    }
    redirect("/admin/applications?error=promote");
  }
  revalidateTag(SPEAKERS_CACHE_TAG, "max");
  revalidateApplications(id);
  redirect(`/admin/speakers/${speakerId}/edit`);
}
