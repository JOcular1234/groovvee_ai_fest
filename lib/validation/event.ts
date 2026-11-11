import { z } from "zod";
import { isValidTimeZone } from "@/lib/datetime";
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((u) => (u === "" ? null : u));

export const EVENT_SOURCES = [
  { value: "GROOVVEE", label: "GrooVVee event" },
  { value: "EXTERNAL", label: "External / discovered" },
] as const;

export const EVENT_SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_SOURCES.map((s) => [s.value, s.label])
);

// datetime-local values ("YYYY-MM-DDTHH:mm"), interpreted in `timezone`.
const localDateTime = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s), "Use YYYY-MM-DD HH:mm");

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug is too short")
  .max(160, "Slug is too long")
  .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only");

export const eventInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title is required")
      .max(200, "Title is too long"),
    slug: slugSchema,
    description: z
      .string()
      .trim()
      .min(10, "Description is required (at least 10 characters)")
      .max(8000, "Description is too long"),
    source: z.enum(["GROOVVEE", "EXTERNAL"]),
    externalId: optionalText(200),
    startsAtLocal: localDateTime,
    endsAtLocal: z.union([z.literal(""), localDateTime]),
    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required")
      .max(64)
      .refine(isValidTimeZone, "Must be a valid IANA timezone (e.g. Africa/Lagos)"),
    city: optionalText(120),
    stateProvince: optionalText(120),
    country: optionalText(120),
    region: optionalText(120),
    venueName: optionalText(200),
    locationId: optionalText(64),
    isOnline: z.boolean().default(false),
    url: optionalHttps,
    imageUrl: imageUrlSchema.transform((u) => (u === "" ? null : u)),
    communityId: optionalText(64),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.endsAtLocal) {
      // Wall-clock comparison is valid — both are in the same timezone.
      if (data.endsAtLocal <= data.startsAtLocal) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAtLocal"],
          message: "End must be after the start time",
        });
      }
    }
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const eventFormSchema = eventInputSchema.safeExtend({
  slug: z.union([z.literal(""), slugSchema]),
});
