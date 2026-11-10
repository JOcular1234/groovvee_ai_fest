// Client-safe inquiry category constants — no server-only or native imports.
// Values match the Prisma InquiryType enum.
export const INQUIRY_TYPES = [
  { value: "GENERAL", label: "General inquiry" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SPONSORSHIP", label: "Sponsorship" },
  { value: "STUDIO_PARTICIPATION", label: "Studio participation" },
  { value: "EVENTS", label: "Events" },
  { value: "PRESS", label: "Press" },
  { value: "COMMUNITY", label: "Community" },
  { value: "SPEAKER_APPLICATION", label: "Speaker application" },
] as const;

export const INQUIRY_TYPE_VALUES = INQUIRY_TYPES.map((t) => t.value);

export const INQUIRY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INQUIRY_TYPES.map((t) => [t.value, t.label])
);
