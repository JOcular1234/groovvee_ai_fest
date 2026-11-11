import { formatEventTime, zonedDateKey } from "@/lib/datetime";

// Pure calendar math for the month-view events calendar.
// Events are grouped by their LOCAL date (in each event's own timezone),
// never by UTC date — an event at 19:00 on Dec 4 in Minneapolis may be
// 01:00 UTC on Dec 5, but belongs on the 4th.

export type MonthRef = { year: number; month: number }; // month: 1-12

// Widens the UTC fetch window enough that an event whose local date falls
// inside the month is always included: the largest timezone offsets are
// UTC-12 … UTC+14, comfortably inside ±2 days.
export const TZ_FETCH_BUFFER_DAYS = 2;

export function parseMonthParam(value: string | undefined): MonthRef | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const year = +m[1];
  const month = +m[2];
  if (month < 1 || month > 12 || year < 1900 || year > 2200) return null;
  return { year, month };
}

export function monthParam({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentMonth(now = new Date()): MonthRef {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthLabel({ year, month }: MonthRef): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function daysInMonth({ year, month }: MonthRef): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// UTC window wide enough to catch every event whose local date is in-month.
export function monthFetchRange({ year, month }: MonthRef): {
  from: Date;
  to: Date;
} {
  return {
    from: new Date(Date.UTC(year, month - 1, 1 - TZ_FETCH_BUFFER_DAYS)),
    to: new Date(Date.UTC(year, month, 1 + TZ_FETCH_BUFFER_DAYS)),
  };
}

function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return utcDateKey(new Date(Date.UTC(y, m - 1, d + days)));
}

type TimedEvent = { startsAt: Date; endsAt: Date | null; timezone: string };

// Local date keys an event occupies, start → end inclusive.
// An event ending exactly at local midnight does not claim that final day.
export function eventDateKeys(e: TimedEvent): string[] {
  const startKey = zonedDateKey(e.startsAt, e.timezone);
  let endKey = startKey;
  if (e.endsAt) {
    endKey = zonedDateKey(e.endsAt, e.timezone);
    if (endKey !== startKey && formatEventTime(e.endsAt, e.timezone) === "00:00") {
      endKey = addDaysToKey(endKey, -1);
    }
  }
  const keys: string[] = [];
  for (let k = startKey; k <= endKey; k = addDaysToKey(k, 1)) {
    keys.push(k);
    if (keys.length >= 370) break; // sanity bound for absurd ranges
  }
  return keys;
}

// Groups events by local date, keeping only dates inside the target month.
export function groupEventsByDate<T extends TimedEvent>(
  events: T[],
  ref: MonthRef
): Map<string, T[]> {
  const first = `${monthParam(ref)}-01`;
  const last = `${monthParam(ref)}-${String(daysInMonth(ref)).padStart(2, "0")}`;
  const map = new Map<string, T[]>();
  for (const e of events) {
    for (const key of eventDateKeys(e)) {
      if (key < first || key > last) continue;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
  }
  return map;
}

export type CalendarDay = { dateKey: string; day: number; inMonth: boolean };

// Month grid, weeks starting Monday. Leading/trailing cells come from the
// neighbouring months and are flagged inMonth: false for dimming.
export function buildCalendarGrid({ year, month }: MonthRef): CalendarDay[][] {
  const firstUtc = Date.UTC(year, month - 1, 1);
  const leadDays = (new Date(firstUtc).getUTCDay() + 6) % 7; // Mon = 0
  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];

  for (let i = leadDays; i > 0; i--) {
    const d = new Date(firstUtc - i * 86_400_000);
    week.push({ dateKey: utcDateKey(d), day: d.getUTCDate(), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth({ year, month }); day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    week.push({ dateKey: utcDateKey(d), day, inMonth: true });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  for (let day = 1; week.length > 0 && week.length < 7; day++) {
    const d = new Date(Date.UTC(year, month, day));
    week.push({ dateKey: utcDateKey(d), day: d.getUTCDate(), inMonth: false });
  }
  if (week.length) weeks.push(week);
  return weeks;
}
