import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/validation/topic";

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

const optionalHttps = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u === "" || u.startsWith("https://"), "Must be https://")
  .transform((u) => (u === "" ? null : u));

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(160, "Slug is too long")
  .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only");

export const newsPostInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title is required")
    .max(160, "Title is too long"),
  slug: slugSchema,
  excerpt: z
    .string()
    .trim()
    .min(10, "Excerpt is required (at least 10 characters)")
    .max(500, "Excerpt is too long"),
  body: z
    .string()
    .trim()
    .min(10, "Body is required")
    .max(20000, "Body is too long"),
  coverImageUrl: imageUrlSchema.transform((u) => (u === "" ? null : u)),
  sourceUrl: optionalHttps,
  authorName: z
    .string()
    .trim()
    .max(120)
    .transform((u) => (u === "" ? null : u)),
  published: z.boolean().default(false),
});

export type NewsPostInput = z.infer<typeof newsPostInputSchema>;

// Form variant: blank slug means "generate from title".
export const newsPostFormSchema = newsPostInputSchema.extend({
  slug: z.union([z.literal(""), slugSchema]),
});
