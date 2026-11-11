// Timezone helpers for admin event entry. Dates are entered as wall-clock
// time in the event's IANA timezone and stored as UTC instants.

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/;

function wallToUtcMs(iso: string): number | null {
  const m = WALL_RE.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  return Number.isNaN(ms) ? null : ms;
}

function offsetMs(tz: string, atUtc: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(atUtc));
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    +(parts.find((p) => p.type === t)?.value ?? 0);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return wall - atUtc;
}

// "2026-03-14T18:30" + "Africa/Lagos" → the UTC instant that is 18:30 in Lagos.
// One re-check of the offset handles DST transition edges.
export function zonedToUtc(localIso: string, tz: string): Date | null {
  const wall = wallToUtcMs(localIso);
  if (wall === null || !isValidTimeZone(tz)) return null;
  const utc = wall - offsetMs(tz, wall - offsetMs(tz, wall));
  return new Date(utc);
}

// "Sat 1 Jun 2030 · 10:00" — wall time in the event's own timezone.
export function formatEventDateTime(date: Date, tz: string): string {
  const d = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${d} · ${t}`;
}

// Human-friendly timezone name, e.g. "West Africa Time (GMT+1)".
export function timeZoneLabel(date: Date, tz: string): string {
  const name =
    new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "long" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? tz;
  const offset =
    new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  return offset ? `${name} (${offset})` : name;
}

// "2026-12-04" — the local calendar date of `date` in `tz`. Used for
// timezone-correct calendar grouping (never startsAt.toISOString().slice(0,10),
// which would group by the UTC date instead).
export function zonedDateKey(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// "18:30" — wall time in `tz`.
export function formatEventTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// UTC instant → "YYYY-MM-DDTHH:mm" wall time in `tz`, for datetime-local inputs.
export function utcToZonedLocalInput(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}
