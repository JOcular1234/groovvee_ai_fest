"use client";

import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Mic,
  Newspaper,
  Radar,
  Swords,
  Tags,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/admin/LogoutButton";

const GROUPS: {
  label: string | null;
  links: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    label: null,
    links: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/speakers", label: "Speakers", icon: Mic },
      { href: "/admin/topics", label: "Topics", icon: Tags },
      { href: "/admin/communities", label: "Communities", icon: Users },
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/agenda", label: "Agenda", icon: ListOrdered },
      { href: "/admin/news", label: "News", icon: Newspaper },
      { href: "/admin/competitions", label: "Competitions", icon: Trophy },
    ],
  },
  {
    label: "Inbox",
    links: [
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/hack-wars", label: "Hack Wars", icon: Swords },
      { href: "/admin/messages", label: "Messages", icon: Mail },
      { href: "/admin/discoveries", label: "Discoveries", icon: Radar },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex h-full flex-col gap-6 overflow-x-auto px-5 py-5 sm:px-8 lg:overflow-x-visible lg:py-8"
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
        Admin
      </p>

      <div className="flex gap-6 lg:flex-col lg:gap-5">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex gap-1 lg:flex-col">
            {group.label && (
              <p className="mb-1.5 hidden font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted/60 lg:block">
                {group.label}
              </p>
            )}
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 whitespace-nowrap border-l-2 py-1.5 pl-3 pr-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? "border-volt bg-volt/5 text-volt"
                      : "border-transparent text-muted hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-auto hidden lg:block">
        <LogoutButton />
      </div>
      <div className="lg:hidden">
        <LogoutButton />
      </div>
    </nav>
  );
}
