"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { EVENTS_CACHE_TAG } from "@/lib/public/events";
import {
  createEvent,
  deleteEvent,
  moveEvent,
  setEventFeatured,
  setEventPublished,
  updateEvent,
} from "@/lib/events";
import { SlugConflictError } from "@/lib/slug";
import { eventFormSchema } from "@/lib/validation/event";

export type EventFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type EventActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateEvents() {
  updateTag(EVENTS_CACHE_TAG);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function saveEventAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSectionAccess("events", "manage");

  const parsed = eventFormSchema.safeParse({
    title: formData.get("title"),
    slug: String(formData.get("slug") ?? "").trim(),
    description: formData.get("description") ?? "",
    source: formData.get("source") ?? "GROOVVEE",
    externalId: formData.get("externalId") ?? "",
    startsAtLocal: formData.get("startsAt") ?? "",
    endsAtLocal: formData.get("endsAt") ?? "",
    timezone: formData.get("timezone") ?? "UTC",
    city: formData.get("city") ?? "",
    stateProvince: formData.get("stateProvince") ?? "",
    country: formData.get("country") ?? "",
    region: formData.get("region") ?? "",
    locationId: formData.get("locationId") ?? "",
    venueName: formData.get("venueName") ?? "",
    isOnline: formData.get("isOnline") === "on",
    url: formData.get("url") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    communityId: formData.get("communityId") ?? "",
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
        updateEvent(db, id, parsed.data)
      );
      if (!updated)
        return { ok: false, message: "Event no longer exists." };
    } else {
      await withDbRetry(() => createEvent(db, parsed.data));
    }
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return {
        ok: false,
        errors: { slug: [`“${err.slug}” is already in use.`] },
      };
    }
    if (err instanceof Error && err.message === "invalid_datetime") {
      return {
        ok: false,
        errors: { startsAtLocal: ["Invalid date/time for this timezone."] },
      };
    }
    if (err instanceof Error && err.message === "invalid_community") {
      return {
        ok: false,
        errors: { communityId: ["That community no longer exists."] },
      };
    }
    if (err instanceof Error && err.message === "invalid_location") {
      return {
        ok: false,
        errors: { locationId: ["That location no longer exists."] },
      };
    }
    return { ok: false, message: "Could not save the event. Try again." };
  }

  revalidateEvents();
  redirect("/admin/events");
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<EventActionResult> {
  await requireSectionAccess("events", "manage");
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Event not found." };
    revalidateEvents();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteEventAction(
  id: string
): Promise<EventActionResult> {
  return runMutation(() => deleteEvent(db, id));
}

export async function setEventPublishedAction(
  id: string,
  published: boolean
): Promise<EventActionResult> {
  return runMutation(() => setEventPublished(db, id, published));
}

export async function setEventFeaturedAction(
  id: string,
  featured: boolean
): Promise<EventActionResult> {
  return runMutation(() => setEventFeatured(db, id, featured));
}

export async function moveEventAction(
  id: string,
  direction: -1 | 1
): Promise<EventActionResult> {
  return runMutation(() => moveEvent(db, id, direction));
}
