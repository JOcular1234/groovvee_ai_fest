import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAccountForm } from "@/components/admin/AdminAccountForm";
import { AdminDangerZone } from "@/components/admin/AdminDangerZone";
import {
  adminTdClass,
  adminTrClass,
  AdminPageHeader,
  AdminPageShell,
  AdminTable,
  StatusBadge,
} from "@/components/admin/ui";
import { getAdminById, listAuditLogsForAdmin } from "@/lib/admins";
import { db, withDbRetry } from "@/lib/db";

export const metadata: Metadata = {
  title: "Manage admin · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const ACTION_LABELS: Record<string, string> = {
  "admin.created": "Created account",
  "admin.updated": "Updated name / permissions",
  "admin.deactivated": "Deactivated",
  "admin.reactivated": "Reactivated",
  "admin.password_reset": "Reset password",
};

export default async function ManageAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const admin = await withDbRetry(() => getAdminById(db, id));
  if (!admin) notFound();

  const auditLogs = await withDbRetry(() =>
    listAuditLogsForAdmin(db, admin.id)
  );

  return (
    <AdminPageShell>
      <AdminPageHeader eyebrow="Team" title={admin.name} />

      <div className="mt-8 flex flex-wrap items-center gap-3 border border-white/10 bg-panel px-6 py-4 text-sm">
        <span className="text-muted">{admin.email}</span>
        <StatusBadge tone={admin.role === "SUPER_ADMIN" ? "volt" : "muted"}>
          {admin.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
        </StatusBadge>
        <StatusBadge tone={admin.isActive ? "success" : "danger"}>
          {admin.isActive ? "Active" : "Deactivated"}
        </StatusBadge>
        {admin.mustChangePassword && (
          <StatusBadge tone="amber">Password change pending</StatusBadge>
        )}
        <Link
          href="/admin/admins"
          className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:text-volt"
        >
          ← Back to admins
        </Link>
      </div>

      {admin.role === "SUPER_ADMIN" ? (
        <div className="mt-10 border border-white/10 bg-panel p-8">
          <p className="text-sm text-muted">
            The Super Admin account is provisioned through the CLI and cannot
            be modified here. It always has full access to every section.
          </p>
        </div>
      ) : (
        <>
          <AdminAccountForm
            admin={{
              id: admin.id,
              name: admin.name,
              permissions: admin.permissions,
            }}
          />
          <AdminDangerZone adminId={admin.id} isActive={admin.isActive} />
        </>
      )}

      {auditLogs.length > 0 && (
        <>
          <p className="mt-12 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
            Audit trail
          </p>
          <AdminTable
            minW="min-w-140"
            headers={[
              { label: "When" },
              { label: "Action" },
              { label: "Actor" },
            ]}
          >
            {auditLogs.map((log) => (
              <tr key={log.id} className={adminTrClass}>
                <td className={`${adminTdClass} whitespace-nowrap text-muted`}>
                  {log.createdAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className={adminTdClass}>
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className={`${adminTdClass} text-muted`}>
                  {log.actor ? `${log.actor.name} <${log.actor.email}>` : "—"}
                </td>
              </tr>
            ))}
          </AdminTable>
        </>
      )}
    </AdminPageShell>
  );
}
