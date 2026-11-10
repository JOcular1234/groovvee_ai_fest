// Client-safe application status constants — no server-only or native imports.
export const APPLICATION_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> =
  Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.value, s.label]));
