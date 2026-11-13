"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireSectionAccess } from "@/lib/auth/server";
import {
  createCompetition,
  createCompetitionRound,
  deleteCompetition,
  deleteCompetitionRound,
  moveCompetition,
  moveCompetitionRound,
  setCompetitionFeatured,
  setCompetitionPublished,
  updateCompetition,
  updateCompetitionRound,
} from "@/lib/competitions";
import { db, withDbRetry } from "@/lib/db";
import { COMPETITIONS_CACHE_TAG } from "@/lib/public/competitions";
import { SlugConflictError } from "@/lib/slug";
import {
  competitionFormSchema,
  competitionRoundFormSchema,
} from "@/lib/validation/competition";

export type CompetitionFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type CompetitionActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateCompetitions() {
  updateTag(COMPETITIONS_CACHE_TAG);
  revalidatePath("/admin/competitions");
  revalidatePath("/competitions");
  revalidatePath("/hack-wars");
  revalidatePath("/");
}

export async function saveCompetitionAction(
  _prev: CompetitionFormState,
  formData: FormData
): Promise<CompetitionFormState> {
  await requireSectionAccess("competitions", "manage");

  const parsed = competitionFormSchema.safeParse({
    title: formData.get("title"),
    slug: String(formData.get("slug") ?? "").trim(),
    kind: formData.get("kind") ?? "CONTEST",
    status: formData.get("status") ?? "UPCOMING",
    description: formData.get("description") ?? "",
    startsAtLocal: formData.get("startsAt") ?? "",
    endsAtLocal: formData.get("endsAt") ?? "",
    timezone: formData.get("timezone") ?? "UTC",
    prizeText: formData.get("prizeText") ?? "",
    rulesUrl: formData.get("rulesUrl") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    eventId: formData.get("eventId") ?? "",
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
        updateCompetition(db, id, parsed.data)
      );
      if (!updated)
        return { ok: false, message: "Competition no longer exists." };
    } else {
      await withDbRetry(() => createCompetition(db, parsed.data));
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
    if (err instanceof Error && err.message === "invalid_event") {
      return {
        ok: false,
        errors: { eventId: ["That event no longer exists."] },
      };
    }
    return { ok: false, message: "Could not save the competition. Try again." };
  }

  revalidateCompetitions();
  redirect("/admin/competitions");
}

export async function saveRoundAction(
  _prev: CompetitionFormState,
  formData: FormData
): Promise<CompetitionFormState> {
  await requireSectionAccess("competitions", "manage");

  const competitionId = String(formData.get("competitionId") ?? "");
  const roundId = String(formData.get("roundId") ?? "");
  if (!competitionId) {
    return { ok: false, message: "Missing competition." };
  }

  const parsed = competitionRoundFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    startsAtLocal: formData.get("startsAt") ?? "",
    endsAtLocal: formData.get("endsAt") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await withDbRetry(() =>
      roundId
        ? updateCompetitionRound(db, roundId, parsed.data)
        : createCompetitionRound(db, competitionId, parsed.data)
    );
    if (!result) {
      return {
        ok: false,
        message: roundId
          ? "Round no longer exists."
          : "Competition no longer exists.",
      };
    }
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_datetime") {
      return {
        ok: false,
        errors: { startsAtLocal: ["Invalid date/time for this timezone."] },
      };
    }
    return { ok: false, message: "Could not save the round. Try again." };
  }

  revalidateCompetitions();
  return { ok: true };
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<CompetitionActionResult> {
  await requireSectionAccess("competitions", "manage");
  try {
    const result = await withDbRetry(fn);
    if (result === "has_entries") {
      return {
        ok: false,
        message:
          "This competition has applications, teams or submissions. Remove them first.",
      };
    }
    if (!result || result === "not_found") {
      return { ok: false, message: "Not found." };
    }
    revalidateCompetitions();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteCompetitionAction(
  id: string
): Promise<CompetitionActionResult> {
  return runMutation(() => deleteCompetition(db, id));
}

export async function setCompetitionPublishedAction(
  id: string,
  published: boolean
): Promise<CompetitionActionResult> {
  return runMutation(() => setCompetitionPublished(db, id, published));
}

export async function setCompetitionFeaturedAction(
  id: string,
  featured: boolean
): Promise<CompetitionActionResult> {
  return runMutation(() => setCompetitionFeatured(db, id, featured));
}

export async function moveCompetitionAction(
  id: string,
  direction: -1 | 1
): Promise<CompetitionActionResult> {
  return runMutation(() => moveCompetition(db, id, direction));
}

export async function deleteRoundAction(
  id: string
): Promise<CompetitionActionResult> {
  return runMutation(() => deleteCompetitionRound(db, id));
}

export async function moveRoundAction(
  competitionId: string,
  id: string,
  direction: -1 | 1
): Promise<CompetitionActionResult> {
  return runMutation(() => moveCompetitionRound(db, competitionId, id, direction));
}
