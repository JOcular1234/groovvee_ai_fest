"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { TOPICS_CACHE_TAG } from "@/lib/public/topics";
import {
  createTopic,
  deleteTopic,
  moveTopic,
  setTopicPublished,
  SlugConflictError,
  updateTopic,
} from "@/lib/topics";
import { topicFormSchema } from "@/lib/validation/topic";

export type TopicFormState = {
  ok: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type TopicActionResult = { ok: true } | { ok: false; message: string };

function revalidateTopics() {
  updateTag(TOPICS_CACHE_TAG);
  revalidatePath("/admin/topics");
  revalidatePath("/topics");
  revalidatePath("/");
}

export async function saveTopicAction(
  _prev: TopicFormState,
  formData: FormData
): Promise<TopicFormState> {
  await requireAdmin();

  const parsed = topicFormSchema.safeParse({
    title: formData.get("title"),
    slug: String(formData.get("slug") ?? "").trim(),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
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
        updateTopic(db, id, parsed.data)
      );
      if (!updated) return { ok: false, message: "Topic no longer exists." };
    } else {
      await withDbRetry(() => createTopic(db, parsed.data));
    }
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return {
        ok: false,
        errors: { slug: [`“${err.slug}” is already in use.`] },
      };
    }
    return { ok: false, message: "Could not save the topic. Try again." };
  }

  revalidateTopics();
  redirect("/admin/topics");
}

async function runMutation(
  fn: () => Promise<unknown>
): Promise<TopicActionResult> {
  await requireAdmin();
  try {
    const result = await withDbRetry(fn);
    if (!result) return { ok: false, message: "Topic not found." };
    revalidateTopics();
    return { ok: true };
  } catch {
    return { ok: false, message: "Operation failed. Try again." };
  }
}

export async function deleteTopicAction(
  id: string
): Promise<TopicActionResult> {
  return runMutation(() => deleteTopic(db, id));
}

export async function setTopicPublishedAction(
  id: string,
  published: boolean
): Promise<TopicActionResult> {
  return runMutation(() => setTopicPublished(db, id, published));
}

export async function moveTopicAction(
  id: string,
  direction: -1 | 1
): Promise<TopicActionResult> {
  return runMutation(() => moveTopic(db, id, direction));
}
