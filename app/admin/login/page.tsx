import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/server";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

// Reads cookies() — must render per-request, never prerendered.
export const instant = false;

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-5 py-16">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md border border-white/10 bg-ink p-8 sm:p-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Restricted access
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none">
          Admin <span className="text-volt">login.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          Groovvee AI Fest administration. Authorized administrators only.
        </p>
        <LoginForm />
      </div>
    </section>
  );
}
