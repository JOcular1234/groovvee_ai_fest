import Link from "next/link";
import { MapPin } from "lucide-react";

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

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

function dateKeyParts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(date);
  return {
    weekday: fmt({ weekday: "short" }),
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "short" }),
    full: fmt({ weekday: "long", day: "numeric", month: "long" }),
  };
}

function eventPlace(e: CalendarEventItem) {
  if (e.isOnline) return "Online";
  return [e.venueName, [e.city, e.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(", ");
}

function EventChip({ e }: { e: CalendarEventItem }) {
  return (
    <Link
      href={`/events/${e.slug}`}
      className={`block truncate border-l-2 border-volt bg-volt/10 px-1.5 py-1 text-left text-[11px] leading-tight text-white transition-colors hover:bg-volt/20 hover:text-volt ${focusRing}`}
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
      <div className="mt-8 border border-white/10 bg-panel p-8 text-center sm:p-12">
        <p className="font-display text-3xl uppercase">
          {filtered ? "No matches" : "Quiet month"}
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          {filtered
            ? `No events in ${monthLabel(month)} match these filters.`
            : `No events scheduled in ${monthLabel(month)}. Try another month.`}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-sm text-muted" role="status">
        {total} {total === 1 ? "event" : "events"} in {monthLabel(month)}
      </p>

      {/* Desktop month grid (cells are too narrow for titles below lg) */}
      <div className="hidden border border-white/10 bg-panel lg:block">
        <div className="grid grid-cols-7 border-b border-white/10">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
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
            {week.map((cell, col) => {
              const dayEvents = cell.inMonth
                ? (byDate.get(cell.dateKey) ?? [])
                : [];
              const isToday = cell.dateKey === todayKey;
              const visible = dayEvents.slice(0, MAX_CHIPS);
              const rest = dayEvents.slice(MAX_CHIPS);
              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-32 p-2 ${
                    !cell.inMonth
                      ? "bg-ink/60"
                      : col >= 5
                        ? "bg-white/[0.02]"
                        : ""
                  }`}
                >
                  <p
                    className={`inline-flex min-w-6 justify-center px-1 py-0.5 font-mono text-[11px] font-bold ${
                      isToday
                        ? "bg-volt text-ink"
                        : cell.inMonth
                          ? "text-white"
                          : "text-muted/40"
                    }`}
                    aria-label={isToday ? `Today, ${cell.day}` : undefined}
                  >
                    {cell.day}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {visible.map((e) => (
                      <EventChip key={`${cell.dateKey}-${e.slug}`} e={e} />
                    ))}
                    {rest.length > 0 && (
                      <details className="group">
                        <summary
                          className={`cursor-pointer list-none px-1.5 py-1 font-mono text-[10px] text-muted transition-colors hover:text-volt [&::-webkit-details-marker]:hidden ${focusRing}`}
                        >
                          <span className="group-open:hidden">
                            +{rest.length} more
                          </span>
                          <span className="hidden group-open:inline">
                            Show less
                          </span>
                        </summary>
                        <div className="mt-1 space-y-1">
                          {rest.map((e) => (
                            <EventChip key={`${cell.dateKey}-${e.slug}`} e={e} />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile + tablet: chronological agenda */}
      <ol className="lg:hidden">
        {[...byDate.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([key, dayEvents]) => {
            const p = dateKeyParts(key);
            const isToday = key === todayKey;
            return (
              <li
                key={key}
                className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-white/10 py-5 first:border-t-0 sm:grid-cols-[4.5rem_1fr] sm:gap-6"
              >
                <div
                  className={`self-start border px-2 py-2 text-center ${
                    isToday
                      ? "border-volt bg-volt text-ink"
                      : "border-white/15 text-white"
                  }`}
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                    {p.weekday}
                  </p>
                  <p className="font-display text-2xl leading-none">{p.day}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-70">
                    {p.month}
                  </p>
                </div>

                <div className="min-w-0 space-y-3">
                  <h3 className="sr-only">{p.full}</h3>
                  {isToday && (
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt">
                      Today
                    </p>
                  )}
                  {dayEvents.map((e) => (
                    <Link
                      key={`${key}-${e.slug}`}
                      href={`/events/${e.slug}`}
                      className={`block border border-white/10 bg-panel p-4 transition-colors hover:border-volt ${focusRing}`}
                    >
                      <p className="font-mono text-xs text-volt">
                        {formatEventTime(e.startsAt, e.timezone)}{" "}
                        <span className="text-muted">{e.timezone}</span>
                      </p>
                      <p className="mt-1.5 font-semibold leading-snug text-white">
                        {e.title}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">
                          {eventPlace(e) || "Location TBA"}
                        </span>
                      </p>
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
      </ol>
    </div>
  );
}