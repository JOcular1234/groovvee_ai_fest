import { z } from "zod";

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (u) =>
      u === "" ||
      u.startsWith("https://") ||
      (u.startsWith("/") && !u.startsWith("//")),
    "Must be an https:// URL or a local /path image"
  );

// lowercase letters/digits separated by single hyphens
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(160, "Slug is too long")
  .regex(
    SLUG_PATTERN,
    "Lowercase letters, numbers and hyphens only"
  );

export const topicInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title is required")
    .max(160, "Title is too long"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .min(10, "Description is required (at least 10 characters)")
    .max(4000, "Description is too long"),
  imageUrl: imageUrlSchema.transform((u) => (u === "" ? null : u)),
  published: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type TopicInput = z.infer<typeof topicInputSchema>;

// Form-level variant: slug may be blank, meaning "generate from title".
export const topicFormSchema = topicInputSchema.extend({
  slug: z.union([z.literal(""), slugSchema]),
});
