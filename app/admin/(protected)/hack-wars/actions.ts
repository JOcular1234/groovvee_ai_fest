"use server";

import { revalidatePath } from "next/cache";

import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import {
  INVALID_TRANSITION,
  setHackWarsApplicationStatus,
  updateHackWarsApplicationNotes,
} from "@/lib/hack-wars";
import {
  reviewNotesSchema,
  reviewStatusSchema,
} from "@/lib/validation/application";

export type HackWarsActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateHackWars(id?: string) {
  revalidatePath("/admin/hack-wars");
  if (id) revalidatePath(`/admin/hack-wars/${id}`);
}

export async function setHackWarsStatusAction(
  id: string,
  status: string
): Promise<HackWarsActionResult> {
  const admin = await requireSectionAccess("hack-wars", "manage");
  const parsed = reviewStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "Invalid status." };
  try {
    const result = await withDbRetry(() =>
      setHackWarsApplicationStatus(db, id, admin.id, parsed.data)
    );
    if (!result) return { ok: false, message: "Application not found." };
    revalidateHackWars(id);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_TRANSITION) {
      return { ok: false, message: "That status change is not allowed." };
    }
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function updateHackWarsNotesAction(
  id: string,
  notes: string
): Promise<HackWarsActionResult> {
  const admin = await requireSectionAccess("hack-wars", "manage");
  const parsed = reviewNotesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, message: "Notes are too long." };
  const result = await withDbRetry(() =>
    updateHackWarsApplicationNotes(db, id, admin.id, parsed.data || null)
  );
  if (!result) return { ok: false, message: "Application not found." };
  revalidateHackWars(id);
  return { ok: true };
}
