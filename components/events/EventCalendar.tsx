import Link from "next/link";

import {
  buildCalendarGrid,
  monthLabel,
  type MonthRef,
} from "@/lib/calendar";
import { formatEventTime, zonedDateKey } from "@/lib/datetime";

export type CalendarEventItem = {
  slug: string;
  title: string;
  startsAt: Date;
  timezone: string;
  isOnline: boolean;
  city: string | null;
  country: string | null;
  venueName: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function dateKeyLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function eventPlace(e: CalendarEventItem) {
  if (e.isOnline) return "Online";
  return [e.venueName, [e.city, e.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
}

function EventLink({ e }: { e: CalendarEventItem }) {
  return (
    <Link
      href={`/events/${e.slug}`}
      className="block truncate text-left text-[11px] text-white transition-colors hover:text-volt"
      title={`${e.title} — ${eventPlace(e) || "Location TBA"}`}
    >
      <span className="font-mono text-volt">
        {formatEventTime(e.startsAt, e.timezone)}
      </span>{" "}
      {e.title}
    </Link>
  );
}

export function EventCalendar({
  month,
  byDate,
  filtered,
}: {
  month: MonthRef;
  byDate: Map<string, CalendarEventItem[]>;
  filtered: boolean;
}) {
  const weeks = buildCalendarGrid(month);
  const todayKey = zonedDateKey(new Date(), "UTC");
  const total = [...byDate.values()].reduce((n, arr) => n + arr.length, 0);

  if (total === 0) {
    return (
      <div className="mt-10 border border-white/10 bg-panel p-12 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {filtered ? "No matches" : "Quiet month"}
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          {filtered
            ? `No events in ${monthLabel(month)} match these filters.`
            : `No events scheduled in ${monthLabel(month)} — try another month.`}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Desktop month grid */}
      <div className="hidden border border-white/10 bg-panel md:block">
        <div className="grid grid-cols-7 border-b border-white/10">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div
            key={i}
            className="grid grid-cols-7 divide-x divide-white/5 border-b border-white/5 last:border-b-0"
          >
            {week.map((cell) => {
              const dayEvents = cell.inMonth ? (byDate.get(cell.dateKey) ?? []) : [];
              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-28 p-2 ${
                    cell.inMonth ? "" : "bg-ink/60"
                  } ${cell.dateKey === todayKey ? "outline -outline-offset-1 outline-volt/60" : ""}`}
                >
                  <p
                    className={`font-mono text-[10px] font-bold ${
                      cell.inMonth ? "text-white" : "text-muted/40"
                    }`}
                  >
                    {cell.day}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                      <EventLink key={`${cell.dateKey}-${e.slug}`} e={e} />
                    ))}
                    {dayEvents.length > MAX_CHIPS && (
                      <p className="font-mono text-[10px] text-muted">
                        +{dayEvents.length - MAX_CHIPS} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile: chronological agenda list */}
      <div className="md:hidden">
        {[...byDate.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([key, dayEvents]) => (
            <div key={key} className="border-b border-white/10 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
                {dateKeyLabel(key)}
              </p>
              <div className="mt-3 space-y-3">
                {dayEvents.map((e) => (
                  <Link
                    key={`${key}-${e.slug}`}
                    href={`/events/${e.slug}`}
                    className="block"
                  >
                    <p className="font-mono text-xs text-volt">
                      {formatEventTime(e.startsAt, e.timezone)} {e.timezone}
                    </p>
                    <p className="mt-1 font-semibold text-white">{e.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {eventPlace(e) || "Location TBA"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
