"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import {
  approveCandidate,
  DiscoveryBlockedError,
  markCandidateDuplicate,
  rejectCandidate,
  runDiscovery,
} from "@/lib/discovery/service";
import { AlreadyReviewedError } from "@/lib/discovery/service";
import { ProviderNotConfiguredError } from "@/lib/discovery/types";
import { SlugConflictError } from "@/lib/slug";
import { EVENTS_CACHE_TAG } from "@/lib/public/events";
import { LOCATIONS_CACHE_TAG } from "@/lib/public/locations";
import { eventFormSchema } from "@/lib/validation/event";
import { discoveryRunFormSchema } from "@/lib/validation/discovery";

export type DiscoveryFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

function revalidateDiscoveries() {
  revalidatePath("/admin/discoveries");
}

function revalidatePublicEvents() {
  updateTag(EVENTS_CACHE_TAG);
  updateTag(LOCATIONS_CACHE_TAG);
  revalidatePath("/events");
  revalidatePath("/");
}

export async function runDiscoveryAction(
  _prev: DiscoveryFormState,
  formData: FormData
): Promise<DiscoveryFormState> {
  const admin = await requireAdmin();

  const parsed = discoveryRunFormSchema.safeParse({
    region: formData.get("region") ?? "",
    country: formData.get("country") ?? "",
    city: formData.get("city") ?? "",
    categories: formData.getAll("categories").map(String),
    dateFrom: formData.get("dateFrom") ?? "",
    dateTo: formData.get("dateTo") ?? "",
    maxResults: formData.get("maxResults") ?? 10,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await withDbRetry(() =>
      runDiscovery(db, admin.id, parsed.data)
    );
    revalidateDiscoveries();
    return {
      ok: true,
      message: `Discovery complete — ${result.inserted} candidates added${result.invalid ? `, ${result.invalid} invalid skipped` : ""}.`,
    };
  } catch (err) {
    revalidateDiscoveries();
    if (err instanceof DiscoveryBlockedError)
      return { ok: false, message: err.message };
    if (err instanceof ProviderNotConfiguredError)
      return { ok: false, message: err.message };
    return {
      ok: false,
      message:
        "Discovery run failed. The run was recorded — check the runs list for details.",
    };
  }
}

export async function approveCandidateAction(
  candidateId: string,
  _prev: DiscoveryFormState,
  formData: FormData
): Promise<DiscoveryFormState> {
  const admin = await requireAdmin();

  const parsed = eventFormSchema.safeParse({
    title: formData.get("title"),
    slug: String(formData.get("slug") ?? "").trim(),
    description: formData.get("description") ?? "",
    source: "EXTERNAL",
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
    communityId: "",
    featured: false,
    published: true,
    sortOrder: 0,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await withDbRetry(() =>
      approveCandidate(
        db,
        candidateId,
        admin.id,
        parsed.data,
        String(formData.get("reviewNotes") ?? "").trim() || null
      )
    );
  } catch (err) {
    if (err instanceof AlreadyReviewedError)
      return { ok: false, message: err.message };
    if (err instanceof SlugConflictError)
      return { ok: false, errors: { slug: [`"${err.slug}" is already in use.`] } };
    if (err instanceof Error && err.message === "invalid_datetime")
      return {
        ok: false,
        errors: { startsAtLocal: ["Invalid date/time for this timezone."] },
      };
    if (err instanceof Error && err.message === "invalid_location")
      return {
        ok: false,
        errors: { locationId: ["That location no longer exists."] },
      };
    return {
      ok: false,
      message: "Approval failed — the candidate is still pending. Try again.",
    };
  }

  revalidatePublicEvents();
  revalidateDiscoveries();
  redirect("/admin/discoveries");
}

export async function rejectCandidateAction(
  candidateId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  try {
    await withDbRetry(() =>
      rejectCandidate(
        db,
        candidateId,
        admin.id,
        String(formData.get("reviewNotes") ?? "").trim() || null
      )
    );
  } catch {
    // Already reviewed or missing — the refreshed list reflects the state.
  }
  revalidateDiscoveries();
  redirect("/admin/discoveries");
}

export async function markDuplicateAction(
  candidateId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  const eventId = String(formData.get("duplicateOfEventId") ?? "") || null;
  try {
    await withDbRetry(() =>
      markCandidateDuplicate(
        db,
        candidateId,
        admin.id,
        eventId,
        String(formData.get("reviewNotes") ?? "").trim() || null
      )
    );
  } catch {
    // Invalid target / already reviewed — refreshed list shows state.
  }
  revalidateDiscoveries();
  redirect("/admin/discoveries");
}
