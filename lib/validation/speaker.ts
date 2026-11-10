import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .refine((u) => u.startsWith("https://"), "Only https:// links are allowed");

// Profile images: full https URL, or a local public asset path like /speakers/x.webp
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

export const SOCIAL_PLATFORMS = [
  "Website",
  "LinkedIn",
  "X",
  "GitHub",
] as const;

export const socialLinkSchema = z.object({
  label: z.string().trim().min(1).max(30),
  url: httpsUrl,
});

export const speakerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(120, "Name is too long"),
  title: z.string().trim().max(160, "Title is too long").default(""),
  organization: z
    .string()
    .trim()
    .max(160, "Organization is too long")
    .default(""),
  bio: z.string().trim().max(4000, "Bio is too long").default(""),
  imageUrl: imageUrlSchema.transform((u) => (u === "" ? null : u)),
  socials: z.array(socialLinkSchema).max(8).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type SpeakerInput = z.infer<typeof speakerInputSchema>;
