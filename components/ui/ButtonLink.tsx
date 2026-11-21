import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "dark" | "outlineDark";
  className?: string;
};

const variants = {
  primary: "bg-volt text-ink hover:bg-white",
  outline:
    "border border-white/25 text-white hover:border-volt hover:text-volt",
  dark: "bg-ink text-volt hover:bg-panel",
  outlineDark:
    "border border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-volt",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors duration-200 ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
