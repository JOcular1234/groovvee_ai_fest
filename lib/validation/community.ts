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

export const COMMUNITY_TYPES = [
  { value: "STUDENT_TRIBE", label: "AI Student Tribe" },
  { value: "CAMPUS", label: "Campus Community" },
  { value: "CREATIVE", label: "Creative AI Group" },
  { value: "INDUSTRY", label: "Industry Group" },
] as const;

export const COMMUNITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  COMMUNITY_TYPES.map((t) => [t.value, t.label])
);

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(160, "Slug is too long")
  .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only");

export const communityInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(160, "Name is too long"),
  slug: slugSchema,
  type: z.enum(["STUDENT_TRIBE", "CAMPUS", "CREATIVE", "INDUSTRY"]),
  description: z
    .string()
    .trim()
    .min(10, "Description is required (at least 10 characters)")
    .max(4000, "Description is too long"),
  imageUrl: imageUrlSchema.transform((u) => (u === "" ? null : u)),
  city: z
    .string()
    .trim()
    .max(120)
    .transform((u) => (u === "" ? null : u)),
  country: z
    .string()
    .trim()
    .max(120)
    .transform((u) => (u === "" ? null : u)),
  joinUrl: optionalHttps,
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type CommunityInput = z.infer<typeof communityInputSchema>;

// Form variant: blank slug means "generate from name".
export const communityFormSchema = communityInputSchema.extend({
  slug: z.union([z.literal(""), slugSchema]),
});
