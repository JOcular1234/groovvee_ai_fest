"use client";

import { useEffect, useState } from "react";
import { event } from "@/data/event";
import { Reveal } from "@/components/ui/Reveal";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  };
}

const units: { key: keyof TimeLeft; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

export function Countdown() {
  const [target] = useState<Date | null>(() =>
    event.startDate ? new Date(event.startDate) : null
  );
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!target) return;
    const tick = () => setTimeLeft(getTimeLeft(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const started =
    target !== null &&
    timeLeft !== null &&
    timeLeft.days + timeLeft.hours + timeLeft.minutes + timeLeft.seconds === 0;

  return (
    <section className="border-b border-white/10 bg-ink py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              <span className="inline-block size-2 bg-volt" aria-hidden />
              Countdown
            </p>
            <h2 className="mt-5 font-display text-4xl uppercase leading-[0.95] sm:text-5xl lg:text-6xl">
              {started ? (
                <>
                  The fest is <span className="text-volt">live.</span>
                </>
              ) : (
                <>
                  The clock is <span className="text-volt">ticking.</span>
                </>
              )}
            </h2>
          </div>
          {!target && (
            <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-[0.2em] text-muted">
              Date announcement coming soon — follow along for the drop.
            </p>
          )}
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
            {units.map(({ key, label }) => (
              <div
                key={key}
                className="flex flex-col items-center bg-ink px-4 py-8 sm:py-12"
              >
                <span className="font-display text-5xl tabular-nums leading-none sm:text-7xl">
                  {timeLeft ? String(timeLeft[key]).padStart(2, "0") : "--"}
                </span>
                <span className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-volt">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
