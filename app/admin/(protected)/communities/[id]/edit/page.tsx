import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { CommunityForm } from "@/components/admin/CommunityForm";
import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { getCommunityById } from "@/lib/communities";

export const metadata: Metadata = {
  title: "Edit Community · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSectionAccess("communities", "manage");
  await connection();
  const { id } = await params;
  const community = await withDbRetry(() => getCommunityById(db, id));
  if (!community) notFound();

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Communities
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit community<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <CommunityForm
            community={{
              id: community.id,
              name: community.name,
              slug: community.slug,
              type: community.type,
              category: community.category ?? "",
              description: community.description,
              imageUrl: community.imageUrl ?? "",
              city: community.city ?? "",
              country: community.country ?? "",
              joinUrl: community.joinUrl ?? "",
              featured: community.featured,
              published: community.published,
              sortOrder: community.sortOrder,
            }}
          />
        </div>
      </div>
    </section>
  );
}
