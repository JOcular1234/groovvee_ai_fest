import { z } from "zod";

import { isValidTimeZone } from "@/lib/datetime";
import { SLUG_PATTERN } from "@/lib/validation/topic";

// Display labels for competition kinds and statuses — shared by the public
// competitions pages.
export const COMPETITION_KIND_LABELS: Record<string, string> = {
  HACK_WARS: "AI Hack Wars",
  CONTEST: "AI Contest",
  COMMUNITY_CONTEST: "Community Contest",
};

export const COMPETITION_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Coming soon",
  REGISTRATION_OPEN: "Registration open",
  RUNNING: "Live now",
  COMPLETED: "Completed",
};

export const COMPETITION_KINDS = [
  { value: "HACK_WARS", label: "AI Hack Wars" },
  { value: "CONTEST", label: "AI Contest" },
  { value: "COMMUNITY_CONTEST", label: "Community Contest" },
] as const;

export const COMPETITION_STATUSES = [
  { value: "UPCOMING", label: "Coming soon" },
  { value: "REGISTRATION_OPEN", label: "Registration open" },
  { value: "RUNNING", label: "Live now" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const optionalHttps = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u === "" || u.startsWith("https://"), "Must be https://")
  .transform((u) => (u === "" ? null : u));

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
  )
  .transform((u) => (u === "" ? null : u));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((u) => (u === "" ? null : u));

// datetime-local values ("YYYY-MM-DDTHH:mm"), interpreted in `timezone`.
const localDateTime = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s), "Use YYYY-MM-DD HH:mm");

const optionalLocalDateTime = z.union([z.literal(""), localDateTime]);

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(160, "Slug is too long")
  .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only");

const dateOrderRefine = (
  data: { startsAtLocal: string; endsAtLocal: string },
  ctx: z.RefinementCtx
) => {
  // Wall-clock comparison is valid — both are in the same timezone.
  if (data.startsAtLocal && data.endsAtLocal && data.endsAtLocal <= data.startsAtLocal) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAtLocal"],
      message: "End must be after the start time",
    });
  }
};

export const competitionInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title is required")
      .max(200, "Title is too long"),
    slug: slugSchema,
    kind: z.enum(["HACK_WARS", "CONTEST", "COMMUNITY_CONTEST"]),
    status: z
      .enum(["UPCOMING", "REGISTRATION_OPEN", "RUNNING", "COMPLETED"])
      .default("UPCOMING"),
    description: z
      .string()
      .trim()
      .min(10, "Description is required (at least 10 characters)")
      .max(8000, "Description is too long"),
    startsAtLocal: optionalLocalDateTime,
    endsAtLocal: optionalLocalDateTime,
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .default("UTC")
      .refine(isValidTimeZone, "Must be a valid IANA timezone (e.g. Africa/Lagos)"),
    prizeText: optionalText(200),
    rulesUrl: optionalHttps,
    imageUrl: imageUrlSchema,
    eventId: optionalText(64),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .superRefine(dateOrderRefine);

export type CompetitionInput = z.infer<typeof competitionInputSchema>;

export const competitionFormSchema = competitionInputSchema.safeExtend({
  slug: z.union([z.literal(""), slugSchema]),
});

// Rounds are entered in the parent competition's timezone.
export const competitionRoundInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Round name is required")
      .max(160, "Round name is too long"),
    description: optionalText(2000),
    startsAtLocal: optionalLocalDateTime,
    endsAtLocal: optionalLocalDateTime,
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .superRefine(dateOrderRefine);

export type CompetitionRoundInput = z.infer<typeof competitionRoundInputSchema>;

export const competitionRoundFormSchema = competitionRoundInputSchema;
