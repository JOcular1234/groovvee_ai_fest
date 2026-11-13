import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { getCurrentAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Change password · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function ChangePasswordPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-5 py-16">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md border border-white/10 bg-ink p-8 sm:p-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {admin.mustChangePassword ? "Password change required" : "Security"}
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none">
          Change <span className="text-volt">password.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          {admin.mustChangePassword
            ? "Your temporary password must be replaced before you can access the admin area."
            : "Choose a new password for your admin account."}
        </p>
        <ChangePasswordForm />
      </div>
    </section>
  );
}
