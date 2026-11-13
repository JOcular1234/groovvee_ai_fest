import type { Metadata } from "next";
import Link from "next/link";

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
import { sectionAccessLevel, ADMIN_SECTIONS } from "@/lib/auth/permissions";
import { db, withDbRetry } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admins · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

function accessSummary(admin: {
  role: string;
  permissions: string[];
}): string {
  if (admin.role === "SUPER_ADMIN") return "Full access";
  let manage = 0;
  let view = 0;
  for (const s of ADMIN_SECTIONS) {
    const level = sectionAccessLevel(admin, s.key);
    if (level === "manage") manage++;
    else if (level === "view") view++;
  }
  if (manage === 0 && view === 0) return "No access";
  const parts: string[] = [];
  if (manage) parts.push(`${manage} manage`);
  if (view) parts.push(`${view} view`);
  return parts.join(" · ");
}

export default async function AdminsPage() {
  const admins = await withDbRetry(() => listAdmins(db));

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
        <AdminTable
          minW="min-w-180"
          headers={[
            { label: "Name" },
            { label: "Email" },
            { label: "Role" },
            { label: "Access" },
            { label: "Status" },
            { label: "Last login" },
            { label: "", align: "right" },
          ]}
        >
          {admins.map((a) => (
            <tr key={a.id} className={adminTrClass}>
              <td className={`${adminTdClass} font-semibold`}>{a.name}</td>
              <td className={`${adminTdClass} text-muted`}>{a.email}</td>
              <td className={adminTdClass}>
                <StatusBadge tone={a.role === "SUPER_ADMIN" ? "volt" : "muted"}>
                  {a.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                </StatusBadge>
              </td>
              <td className={`${adminTdClass} text-muted`}>
                {accessSummary(a)}
              </td>
              <td className={adminTdClass}>
                <StatusBadge tone={a.isActive ? "success" : "danger"}>
                  {a.isActive ? "Active" : "Deactivated"}
                </StatusBadge>
                {a.mustChangePassword && a.isActive && (
                  <StatusBadge tone="amber">Password pending</StatusBadge>
                )}
              </td>
              <td className={`${adminTdClass} text-muted`}>
                {a.lastLoginAt
                  ? a.lastLoginAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Never"}
              </td>
              <td className={`${adminTdClass} text-right`}>
                {a.role !== "SUPER_ADMIN" && (
                  <Link href={`/admin/admins/${a.id}`} className={adminLinkClass}>
                    Manage →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </AdminPageShell>
  );
}
