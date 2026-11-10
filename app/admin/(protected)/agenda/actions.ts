"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAgendaItem,
  deleteAgendaItem,
  INVALID_DATETIME,
  INVALID_EVENT,
  moveAgendaItem,
  setAgendaPublished,
  updateAgendaItem,
} from "@/lib/agenda";
import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { AGENDA_CACHE_TAG } from "@/lib/public/agenda";
import { agendaInputSchema } from "@/lib/validation/agenda";

export type AgendaFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type AgendaActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateAgenda() {
  revalidateTag(AGENDA_CACHE_TAG, "max");
  revalidatePath("/admin/agenda");
  revalidatePath("/events");
}

export async function saveAgendaItemAction(
  _prev: AgendaFormState,
  formData: FormData
): Promise<AgendaFormState> {
  await requireAdmin();

  const parsed = agendaInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type") ?? "TALK",
    startsAtLocal: formData.get("startsAt") ?? "",
    endsAtLocal: formData.get("endsAt") ?? "",
    location: formData.get("location") ?? "",
    eventId: formData.get("eventId") ?? "",
    speakerIds: formData
      .getAll("speakerIds")
      .map((v) => String(v))
      .filter(Boolean),
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
        updateAgendaItem(db, id, parsed.data)
      );
      if (!updated)
        return { ok: false, message: "Agenda item no longer exists." };
    } else {
      await withDbRetry(() => createAgendaItem(db, parsed.data));
    }
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_EVENT) {
      return {
        ok: false,
        errors: { eventId: ["That event no longer exists."] },
      };
    }
    if (err instanceof Error && err.message === INVALID_DATETIME) {
      return {
        ok: false,
        errors: { startsAtLocal: ["Invalid date/time for this timezone."] },
      };
    }
    return { ok: false, message: "Could not save the agenda item. Try again." };
  }

  revalidateAgenda();
  redirect("/admin/agenda");
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<AgendaActionResult> {
  await requireAdmin();
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Agenda item not found." };
    revalidateAgenda();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteAgendaItemAction(
  id: string
): Promise<AgendaActionResult> {
  return runMutation(() => deleteAgendaItem(db, id));
}

export async function setAgendaPublishedAction(
  id: string,
  published: boolean
): Promise<AgendaActionResult> {
  return runMutation(() => setAgendaPublished(db, id, published));
}

export async function moveAgendaItemAction(
  id: string,
  direction: -1 | 1
): Promise<AgendaActionResult> {
  return runMutation(() => moveAgendaItem(db, id, direction));
}
