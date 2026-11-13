import type { Metadata } from "next";

import { CommunityForm } from "@/components/admin/CommunityForm";
import { requireSectionAccess } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "New Community · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function NewCommunityPage() {
  await requireSectionAccess("communities", "manage");
  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Communities
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add community<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <CommunityForm />
        </div>
      </div>
    </section>
  );
}
