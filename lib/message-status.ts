// Client-safe message workflow constants — no server-only or native imports.
export const MESSAGE_STATUS_VALUES = [
  "NEW",
  "READ",
  "IN_PROGRESS",
  "RESOLVED",
  "ARCHIVED",
] as const;

export const MESSAGE_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "READ", label: "Read" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const MESSAGE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  MESSAGE_STATUSES.map((s) => [s.value, s.label])
);
