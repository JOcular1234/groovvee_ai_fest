import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  dark?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  action,
  dark = false,
}: SectionHeadingProps) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p
            className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] ${
              dark ? "text-ink/60" : "text-volt"
            }`}
          >
            <span
              className={`inline-block size-2 ${dark ? "bg-ink" : "bg-volt"}`}
              aria-hidden
            />
            {eyebrow}
          </p>
          <h2
            className={`mt-5 font-display text-4xl uppercase leading-[0.95] sm:text-5xl lg:text-6xl ${
              dark ? "text-ink" : "text-white"
            }`}
          >
            {title}
          </h2>
        </div>
        {action}
      </div>
    </Reveal>
  );
}
