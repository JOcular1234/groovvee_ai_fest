import type { Metadata } from "next";

import { NewsPostForm } from "@/components/admin/NewsPostForm";
import { requireSectionAccess } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "New Post · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function NewNewsPostPage() {
  await requireSectionAccess("news", "manage");
  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          News
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Add post<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <NewsPostForm />
        </div>
      </div>
    </section>
  );
}
