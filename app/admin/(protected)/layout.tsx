import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "@/components/admin/LogoutButton";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Requires the session cookie — must render per-request, never prerendered.
export const instant = false;

const navLink =
  "font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <div className="border-b border-white/10 bg-panel/80 px-5 pt-24 pb-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-6" aria-label="Admin">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Admin
            </span>
            <Link href="/admin" className={navLink}>
              Overview
            </Link>
            <Link href="/admin/speakers" className={navLink}>
              Speakers
            </Link>
            <Link href="/admin/topics" className={navLink}>
              Topics
            </Link>
            <Link href="/admin/communities" className={navLink}>
              Communities
            </Link>
            <Link href="/admin/events" className={navLink}>
              Events
            </Link>
            <Link href="/admin/discoveries" className={navLink}>
              Discoveries
            </Link>
            <Link href="/admin/agenda" className={navLink}>
              Agenda
            </Link>
            <Link href="/admin/applications" className={navLink}>
              Applications
            </Link>
            <Link href="/admin/hack-wars" className={navLink}>
              Hack Wars
            </Link>
            <Link href="/admin/messages" className={navLink}>
              Messages
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </div>
      {children}
    </>
  );
}
