import { z } from "zod";
import { slugify } from "@/lib/slug";
import { SLUG_PATTERN } from "@/lib/validation/topic";

export const MAX_NEWS_TAGS = 8;
const MAX_TAG_LENGTH = 32;

// "Generative AI, events" → ["generative-ai", "events"]. Accepts a
// comma-separated string (form) or an array (scripts).
const tagsSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => {
    const raw = Array.isArray(v) ? v : v.split(",");
    return [
      ...new Set(raw.map((t) => slugify(t).slice(0, MAX_TAG_LENGTH)).filter(Boolean)),
    ];
  })
  .refine((t) => t.length <= MAX_NEWS_TAGS, `At most ${MAX_NEWS_TAGS} tags`);

// "" → null (publish now / keep existing date); otherwise an ISO instant.
const publishedAtSchema = z
  .string()
  .trim()
  .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), "Invalid date")
  .transform((s) => (s === "" ? null : new Date(s)));

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
  publishedAt: publishedAtSchema.default(null),
  featured: z.boolean().default(false),
  tags: tagsSchema.default([]),
});

export type NewsPostInput = z.infer<typeof newsPostInputSchema>;

// Form variant: blank slug means "generate from title".
export const newsPostFormSchema = newsPostInputSchema.extend({
  slug: z.union([z.literal(""), slugSchema]),
});
