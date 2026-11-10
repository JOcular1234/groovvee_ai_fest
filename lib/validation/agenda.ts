import { z } from "zod";

export const SESSION_TYPES = [
  { value: "KEYNOTE", label: "Keynote" },
  { value: "TALK", label: "Talk" },
  { value: "PANEL", label: "Panel" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "DEMO", label: "Demo" },
  { value: "NETWORKING", label: "Networking" },
  { value: "BREAK", label: "Break" },
  { value: "OTHER", label: "Other" },
] as const;

export const SESSION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  SESSION_TYPES.map((t) => [t.value, t.label])
);

// datetime-local values, interpreted in the linked event's timezone (UTC when none).
const localDateTime = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s), "Use YYYY-MM-DD HH:mm");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((u) => (u === "" ? null : u));

export const agendaInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title is required")
      .max(200, "Title is too long"),
    description: z
      .string()
      .trim()
      .min(10, "Description is required (at least 10 characters)")
      .max(4000, "Description is too long"),
    type: z.enum([
      "KEYNOTE",
      "TALK",
      "PANEL",
      "WORKSHOP",
      "DEMO",
      "NETWORKING",
      "BREAK",
      "OTHER",
    ]),
    startsAtLocal: localDateTime,
    endsAtLocal: localDateTime,
    location: optionalText(200),
    eventId: optionalText(64),
    speakerIds: z.array(z.string().min(1).max(64)).max(50).default([]),
    published: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .refine((d) => d.endsAtLocal > d.startsAtLocal, {
    path: ["endsAtLocal"],
    message: "End must be after the start time",
  });

export type AgendaInput = z.infer<typeof agendaInputSchema>;
