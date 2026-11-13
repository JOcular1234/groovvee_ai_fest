import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { SpeakerForm } from "@/components/admin/SpeakerForm";
import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { getSpeakerById } from "@/lib/speakers";
import { socialLinkSchema } from "@/lib/validation/speaker";
import { z } from "zod";

export const metadata: Metadata = {
  title: "Edit Speaker · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const socialsSchema = z.array(socialLinkSchema);

export default async function EditSpeakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSectionAccess("speakers", "manage");
  await connection();
  const { id } = await params;
  const speaker = await withDbRetry(() => getSpeakerById(db, id));
  if (!speaker) notFound();

  const socials = socialsSchema.safeParse(speaker.socials).success
    ? (speaker.socials as { label: string; url: string }[])
    : [];

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Speakers
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit speaker<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <SpeakerForm
            speaker={{
              id: speaker.id,
              name: speaker.name,
              title: speaker.title,
              organization: speaker.organization,
              bio: speaker.bio,
              imageUrl: speaker.imageUrl ?? "",
              socials,
              featured: speaker.featured,
              published: speaker.published,
              sortOrder: speaker.sortOrder,
            }}
          />
        </div>
      </div>
    </section>
  );
}
