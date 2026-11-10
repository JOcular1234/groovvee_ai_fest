import { tickerItems } from "@/data/event";

export function Ticker() {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div
      className="overflow-hidden border-y border-ink/20 bg-volt py-3"
      aria-hidden
    >
      <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-10 font-display text-lg uppercase tracking-wide text-ink"
          >
            {item}
            <span className="text-ink/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
