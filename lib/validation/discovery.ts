import { z } from "zod";

import { isValidTimeZone } from "@/lib/datetime";

// Discovery categories — there is no Event.category column, so these live on
// the candidate only and inform the AI prompt + admin review, nothing else.
export const DISCOVERY_CATEGORIES = [
  { value: "conference", label: "Conference / summit" },
  { value: "hackathon", label: "Hackathon / competition" },
  { value: "meetup", label: "Community meetup" },
  { value: "workshop", label: "Workshop / training" },
  { value: "campus", label: "Student / campus" },
  { value: "creative", label: "Creative tech (film, music, design)" },
  { value: "industry", label: "Industry (finance, health, etc.)" },
] as const;

export const DISCOVERY_CATEGORY_VALUES = DISCOVERY_CATEGORIES.map(
  (c) => c.value
) as [string, ...string[]];

const httpsUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL");

const nullableText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null));

// A single candidate in a provider response. Everything is treated as
// untrusted AI output: unparseable rows are rejected before storage, and
// anything uncertain lands in missingFields for the reviewer.
export const discoveredCandidateSchema = z.object({
  title: z.string().trim().min(2).max(300),
  description: z
    .union([z.string().trim().max(8000), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v : "")),
  // "2026-12-04", "2026-12-04T18:00", or full ISO — kept as text here and
  // resolved against `timezone` by the service.
  startDate: z
    .union([z.string().trim().max(40), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  endDate: z
    .union([z.string().trim().max(40), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  timezone: z
    .union([z.string().trim().max(64), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null))
    .refine((v) => v === null || isValidTimeZone(v), "Invalid IANA timezone"),
  venueName: nullableText(300),
  city: nullableText(120),
  stateProvince: nullableText(120),
  country: nullableText(120),
  registrationUrl: z
    .union([httpsUrl, z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v : null)),
  sourceUrl: httpsUrl,
  imageUrl: z
    .union([httpsUrl, z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v : null)),
  category: z
    .union([z.string().trim().max(60), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  externalId: z
    .union([z.string().trim().max(200), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  confidence: z
    .union([z.enum(["high", "medium", "low"]), z.null(), z.undefined()])
    .transform((v) => v ?? null),
  // Free-text grounding excerpt the model supplied for the claimed facts.
  evidence: z
    .union([z.string().trim().max(2000), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.length > 0 ? v : null)),
  missingFields: z
    .union([z.array(z.string().trim().max(60)).max(20), z.null(), z.undefined()])
    .transform((v) => (Array.isArray(v) ? v : [])),
});

export type DiscoveredCandidate = z.infer<typeof discoveredCandidateSchema>;

export const discoveredEventsResponseSchema = z.object({
  events: z.array(discoveredCandidateSchema).max(50),
});

// Admin run form.
const dateOnly = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s), "Use YYYY-MM-DD");

export const discoveryRunFormSchema = z
  .object({
    region: z.string().trim().max(120).transform((s) => s || undefined),
    country: z.string().trim().max(120).transform((s) => s || undefined),
    city: z.string().trim().max(120).transform((s) => s || undefined),
    categories: z.array(z.enum(DISCOVERY_CATEGORY_VALUES)).max(10).default([]),
    dateFrom: dateOnly,
    dateTo: dateOnly,
    maxResults: z.coerce.number().int().min(1).max(25).default(10),
  })
  .superRefine((d, ctx) => {
    if (d.dateTo < d.dateFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "End date must be on or after the start date",
      });
    }
  });

export type DiscoveryRunInput = z.infer<typeof discoveryRunFormSchema>;
