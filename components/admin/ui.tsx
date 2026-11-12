import { Plus, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

// Shared chrome for admin list pages: section shell, page header, search
// form, empty state, table and pagination. Keeps the black/volt convention
// in one place instead of duplicating ~100 lines per list page.

export const adminSelectClass =
  "border border-white/15 bg-ink px-3 py-3 text-sm text-white outline-none focus:border-volt";
export const adminThClass = "px-4 py-3 font-bold";
export const adminTdClass = "px-4 py-3";
export const adminTrClass = "border-b border-white/5 last:border-0";
export const adminLinkClass =
  "font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:text-volt";

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-display text-5xl uppercase leading-none sm:text-6xl">
          {title}
          <span className="text-volt">.</span>
        </h1>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-volt px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function AdminSearchBar({
  action,
  placeholder,
  query,
  children,
}: {
  action: string;
  placeholder: string;
  query: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} className="mt-10 flex flex-wrap items-end gap-2">
      <div className="relative min-w-55 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="w-full border border-white/15 bg-ink py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted/50 outline-none focus:border-volt"
        />
      </div>
      {children}
      <button
        type="submit"
        className="border border-white/25 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
      >
        Filter
      </button>
    </form>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-12 border border-white/10 bg-panel p-10 text-center">
      <p className="text-muted">{children}</p>
    </div>
  );
}

export function AdminTable({
  minW = "min-w-200",
  headers,
  children,
}: {
  minW?: string;
  headers: { label: ReactNode; align?: "right" }[];
  children: ReactNode;
}) {
  return (
    <div className="mt-8 overflow-x-auto border border-white/10 bg-panel">
      <table className={`w-full ${minW} text-left text-sm`}>
        <thead>
          <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`${adminThClass}${h.align === "right" ? " text-right" : ""}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const badgeTones = {
  volt: "bg-volt/15 text-volt",
  success: "bg-emerald-400/15 text-emerald-300",
  danger: "bg-red-400/15 text-red-300",
  info: "bg-sky-400/15 text-sky-300",
  amber: "bg-amber-400/15 text-amber-300",
  neutral: "bg-white/10 text-white/70",
  muted: "bg-white/10 text-muted",
  ghost: "bg-white/5 text-muted",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function StatusBadge({
  tone = "muted",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminPagination({
  page,
  pages,
  total,
  unit,
  href,
}: {
  page: number;
  pages: number;
  total: number;
  unit: string;
  href: (p: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={`border px-4 py-2 ${
          page <= 1
            ? "pointer-events-none border-white/10 text-muted/40"
            : "border-white/25 text-white hover:border-volt hover:text-volt"
        }`}
      >
        ← Prev
      </Link>
      <span className="text-muted">
        Page {page} of {pages} · {total} {unit}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        className={`border px-4 py-2 ${
          page >= pages
            ? "pointer-events-none border-white/10 text-muted/40"
            : "border-white/25 text-white hover:border-volt hover:text-volt"
        }`}
      >
        Next →
      </Link>
    </div>
  );
}
