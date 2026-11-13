import type { ReactNode } from "react";

import { requireSuperAdmin } from "@/lib/auth/server";

// Admin management is SUPER_ADMIN-only, enforced here for every page in the
// section — layout-level gate plus the per-action checks in actions.ts.
export const instant = false;

export default async function AdminsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSuperAdmin();
  return children;
}
