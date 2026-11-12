import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Requires the session cookie — must render per-request, never prerendered.
export const instant = false;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    // The public navbar is hidden on /admin via NavbarVisibility — the
    // sidebar owns the full viewport height.
    <div className="flex flex-col lg:min-h-dvh lg:flex-row">
      <aside className="border-b border-white/10 bg-panel/60 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:self-start lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
