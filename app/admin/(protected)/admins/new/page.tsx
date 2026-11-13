import type { Metadata } from "next";

import { AdminAccountForm } from "@/components/admin/AdminAccountForm";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "New admin · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function NewAdminPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader eyebrow="Team" title="New admin" />
      <AdminAccountForm />
    </AdminPageShell>
  );
}
