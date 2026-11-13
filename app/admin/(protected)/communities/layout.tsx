import type { ReactNode } from "react";

import { requireSectionAccess } from "@/lib/auth/server";

// View gate for the whole section — every page under /admin/communities.
// Mutations are separately gated in actions.ts with "manage".
export const instant = false;

export default async function SectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSectionAccess("communities", "view");
  return children;
}
