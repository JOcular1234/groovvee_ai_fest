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

// Named creative/industry verticals — mirrors the CommunityCategory enum.
// Alphabetical by label so dropdowns (communities filter, Hack Wars apply)
// stay easy to scan.
export const COMMUNITY_CATEGORIES = [
  { value: "ADVERTISING", label: "AI Advertising" },
  { value: "AGRICULTURE", label: "AI Agriculture" },
  { value: "ARCHITECTURE", label: "AI Architecture" },
  { value: "CONSTRUCTION", label: "AI Construction" },
  { value: "CONSUMER_PRODUCTS", label: "AI Consumer Products" },
  { value: "EDUCATION", label: "AI Education" },
  { value: "ENERGY", label: "AI Energy" },
  { value: "FASHION", label: "AI Fashion" },
  { value: "FILM", label: "AI Filmmakers" },
  { value: "FINANCE", label: "AI Finance" },
  { value: "GAMING", label: "AI Gaming" },
  { value: "GOVERNMENT", label: "AI Government" },
  { value: "HEALTHCARE", label: "AI Healthcare" },
  { value: "LEGAL", label: "AI Legal" },
  { value: "MANUFACTURING", label: "AI Manufacturing" },
  { value: "MEDIA", label: "AI Media" },
  { value: "MOBILITY", label: "AI Mobility" },
  { value: "MUSIC", label: "AI Music" },
  { value: "REAL_ESTATE", label: "AI Real Estate" },
  { value: "SUSTAINABILITY", label: "AI Sustainability" },
  { value: "TELECOM", label: "AI Telecom" },
  { value: "TRAVEL", label: "AI Travel & Hospitality" },
] as const;

export type CommunityCategoryValue =
  (typeof COMMUNITY_CATEGORIES)[number]["value"];

export const COMMUNITY_CATEGORY_VALUES = COMMUNITY_CATEGORIES.map(
  (c) => c.value
) as [CommunityCategoryValue, ...CommunityCategoryValue[]];

export const COMMUNITY_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(COMMUNITY_CATEGORIES.map((c) => [c.value, c.label]));

// Shared zod enum — reused anywhere a category needs validating
// (community forms, Hack Wars applications).
export const communityCategorySchema = z.enum(COMMUNITY_CATEGORY_VALUES);

export function isCommunityCategory(
  v: string | undefined | null
): v is CommunityCategoryValue {
  return (COMMUNITY_CATEGORY_VALUES as readonly string[]).includes(v ?? "");
}

// Section headings need plurals ("Campus Communities", not "Campus Communitys").
export const COMMUNITY_TYPE_PLURALS: Record<string, string> = {
  STUDENT_TRIBE: "AI Student Tribes",
  CAMPUS: "Campus Communities",
  CREATIVE: "Creative AI Groups",
  INDUSTRY: "Industry Groups",
};

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
  // Optional creative/industry vertical — null for student tribes, campus
  // groups and uncategorized communities.
  category: communityCategorySchema.nullable().default(null),
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
