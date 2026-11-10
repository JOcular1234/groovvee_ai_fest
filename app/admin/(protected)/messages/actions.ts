"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { setMessageStatus, updateMessageNotes } from "@/lib/messages";
import {
  messageNotesSchema,
  messageStatusSchema,
} from "@/lib/validation/message";

export type MessageActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateMessages(id?: string) {
  revalidatePath("/admin/messages");
  if (id) revalidatePath(`/admin/messages/${id}`);
}

export async function setMessageStatusAction(
  id: string,
  status: string
): Promise<MessageActionResult> {
  const admin = await requireAdmin();
  const parsed = messageStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "Invalid status." };
  try {
    const result = await withDbRetry(() =>
      setMessageStatus(db, id, admin.id, parsed.data)
    );
    if (!result) return { ok: false, message: "Message not found." };
    revalidateMessages(id);
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function updateMessageNotesAction(
  id: string,
  notes: string
): Promise<MessageActionResult> {
  const admin = await requireAdmin();
  const parsed = messageNotesSchema.safeParse(notes);
  if (!parsed.success) return { ok: false, message: "Notes are too long." };
  const result = await withDbRetry(() =>
    updateMessageNotes(db, id, admin.id, parsed.data || null)
  );
  if (!result) return { ok: false, message: "Message not found." };
  revalidateMessages(id);
  return { ok: true };
}
