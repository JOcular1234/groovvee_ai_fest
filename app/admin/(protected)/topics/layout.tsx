import type { ReactNode } from "react";

import { requireSectionAccess } from "@/lib/auth/server";

// View gate for the whole section — every page under /admin/topics.
// Mutations are separately gated in actions.ts with "manage".
export const instant = false;

export default async function SectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSectionAccess("topics", "view");
  return children;
}
