import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  adminLinkClass,
  adminTdClass,
  adminTrClass,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminTable,
  StatusBadge,
} from "@/components/admin/ui";
import { listAdmins } from "@/lib/admins";
import {
  sectionAccessLevel,
  ADMIN_SECTIONS,
  type AdminSection,
} from "@/lib/auth/permissions";
import { db, withDbRetry } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admins · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

type AdminRow = Awaited<ReturnType<typeof listAdmins>>[number];
type Level = "manage" | "view" | "none";

function levelOf(admin: AdminRow, key: AdminSection): Level {
  const l = sectionAccessLevel(admin, key);
  return l === "manage" || l === "view" ? l : "none";
}

function accessSummary(admin: AdminRow): string {
  if (admin.role === "SUPER_ADMIN") return "Full access";
  let manage = 0;
  let view = 0;
  for (const s of ADMIN_SECTIONS) {
    const level = levelOf(admin, s.key);
    if (level === "manage") manage++;
    else if (level === "view") view++;
  }
  if (manage === 0 && view === 0) return "No access";
  const parts: string[] = [];
  if (manage) parts.push(`${manage} manage`);
  if (view) parts.push(`${view} view`);
  return parts.join(", ");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")) ||
    "?"
  ).toUpperCase();
}

function relativeTime(d: Date, now: Date) {
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

const fullDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

function Avatar({ admin, size = "md" }: { admin: AdminRow; size?: "md" | "lg" }) {
  const sup = admin.role === "SUPER_ADMIN";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-display uppercase ${
        size === "lg" ? "size-12 text-lg" : "size-10 text-sm"
      } ${
        sup ? "bg-volt text-ink" : "border border-white/20 text-white"
      } ${admin.isActive ? "" : "opacity-40"}`}
    >
      {initials(admin.name)}
    </span>
  );
}

// One square per section: filled = manage, half = view, outline = none
function AccessMeter({ admin }: { admin: AdminRow }) {
  const sup = admin.role === "SUPER_ADMIN";
  return (
    <div>
      <div
        className="flex flex-wrap gap-1"
        role="img"
        aria-label={`Access: ${accessSummary(admin)}`}
      >
        {ADMIN_SECTIONS.map((s) => {
          const level: Level = sup ? "manage" : levelOf(admin, s.key);
          return (
            <span
              key={s.key}
              title={`${s.label}: ${level === "none" ? "no access" : level}`}
              className={`size-2.5 ${
                level === "manage"
                  ? "bg-volt"
                  : level === "view"
                    ? "bg-volt/35"
                    : "border border-white/20"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">{accessSummary(admin)}</p>
    </div>
  );
}

function StatusCell({ admin }: { admin: AdminRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusBadge tone={admin.isActive ? "success" : "danger"}>
        {admin.isActive ? "Active" : "Deactivated"}
      </StatusBadge>
      {admin.mustChangePassword && admin.isActive && (
        <StatusBadge tone="amber">Password pending</StatusBadge>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 sm:p-6 ${highlight ? "bg-volt text-ink" : "bg-panel"}`}>
      <dt
        className={`font-mono text-[10px] font-bold uppercase tracking-[0.25em] ${
          highlight ? "text-ink/70" : "text-muted"
        }`}
      >
        {label}
      </dt>
      <dd className="mt-3 font-display text-5xl leading-none sm:text-6xl">
        {value}
      </dd>
      {note && (
        <p className={`mt-2 text-xs ${highlight ? "text-ink/70" : "text-muted"}`}>
          {note}
        </p>
      )}
    </div>
  );
}

export default async function AdminsPage() {
  await connection();
  const admins = await withDbRetry(() => listAdmins(db));
  const now = new Date();

  const active = admins.filter((a) => a.isActive).length;
  const supers = admins.filter((a) => a.role === "SUPER_ADMIN").length;
  const pending = admins.filter((a) => a.isActive && a.mustChangePassword).length;
  const deactivated = admins.length - active;

  const lastLogin = (a: AdminRow) =>
    a.lastLoginAt ? (
      <span title={fullDate(a.lastLoginAt)}>{relativeTime(a.lastLoginAt, now)}</span>
    ) : (
      <span className="text-muted/70">Never</span>
    );

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Team"
        title="Admins"
        action={{ href: "/admin/admins/new", label: "New admin" }}
      />

      {admins.length === 0 ? (
        <AdminEmptyState>No administrators found.</AdminEmptyState>
      ) : (
        <>
          {/* At-a-glance numbers */}
          <dl className="mt-8 grid grid-cols-2 gap-px border border-white/10 bg-white/10 lg:grid-cols-4">
            <Stat label="Total admins" value={admins.length} highlight />
            <Stat
              label="Super admins"
              value={supers}
              note="Full access to everything"
            />
            <Stat
              label="Active"
              value={active}
              note={deactivated > 0 ? `${deactivated} deactivated` : "All accounts active"}
            />
            <Stat
              label="Pending setup"
              value={pending}
              note={pending > 0 ? "Haven't set a password yet" : "Everyone has signed in"}
            />
          </dl>

          {/* Legend for the access meter */}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
              Access key
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 bg-volt" aria-hidden /> Manage
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 bg-volt/35" aria-hidden /> View
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 border border-white/20" aria-hidden /> No access
            </span>
            <span className="text-muted/70">One square per section. Hover for details.</span>
          </div>

          {/* Desktop / tablet: table */}
          <div className="mt-4 hidden md:block">
            <AdminTable
              minW="min-w-180"
              headers={[
                { label: "Admin" },
                { label: "Role" },
                { label: "Access" },
                { label: "Status" },
                { label: "Last sign-in" },
                { label: "", align: "right" },
              ]}
            >
              {admins.map((a) => (
                <tr key={a.id} className={adminTrClass}>
                  <td className={adminTdClass}>
                    <div className="flex items-center gap-3">
                      <Avatar admin={a} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/admins/${a.id}`}
                          className={`block truncate font-semibold text-white transition-colors hover:text-volt ${focusRing} ${
                            a.isActive ? "" : "opacity-60"
                          }`}
                        >
                          {a.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={adminTdClass}>
                    <StatusBadge tone={a.role === "SUPER_ADMIN" ? "volt" : "muted"}>
                      {a.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                    </StatusBadge>
                  </td>
                  <td className={adminTdClass}>
                    <AccessMeter admin={a} />
                  </td>
                  <td className={adminTdClass}>
                    <StatusCell admin={a} />
                  </td>
                  <td className={`${adminTdClass} whitespace-nowrap text-xs text-muted`}>
                    {lastLogin(a)}
                  </td>
                  <td className={`${adminTdClass} text-right`}>
                    <Link
                      href={`/admin/admins/${a.id}`}
                      className={`${adminLinkClass} inline-flex items-center gap-1`}
                    >
                      Manage
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </div>

          {/* Mobile: cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {admins.map((a) => (
              <li key={a.id} className="border border-white/10 bg-panel p-4">
                <div className="flex items-center gap-3">
                  <Avatar admin={a} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{a.name}</p>
                    <p className="truncate text-xs text-muted">{a.email}</p>
                  </div>
                  <StatusBadge tone={a.role === "SUPER_ADMIN" ? "volt" : "muted"}>
                    {a.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                  </StatusBadge>
                </div>
                <div className="mt-4">
                  <AccessMeter admin={a} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div className="space-y-1.5">
                    <StatusCell admin={a} />
                    <p className="text-xs text-muted">Last sign-in: {lastLogin(a)}</p>
                  </div>
                  <Link
                    href={`/admin/admins/${a.id}`}
                    className={`${adminLinkClass} inline-flex min-h-11 items-center gap-1`}
                  >
                    Manage
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPageShell>
  );
}