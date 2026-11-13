import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { NewsPostForm } from "@/components/admin/NewsPostForm";
import { requireSectionAccess } from "@/lib/auth/server";
import { db, withDbRetry } from "@/lib/db";
import { getNewsPostById } from "@/lib/news";

export const metadata: Metadata = {
  title: "Edit Post · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditNewsPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSectionAccess("news", "manage");
  await connection();
  const { id } = await params;
  const post = await withDbRetry(() => getNewsPostById(db, id));
  if (!post) notFound();

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          News
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit post<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <NewsPostForm
            post={{
              id: post.id,
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              body: post.body,
              coverImageUrl: post.coverImageUrl ?? "",
              sourceUrl: post.sourceUrl ?? "",
              authorName: post.authorName ?? "",
              published: post.published,
            }}
          />
        </div>
      </div>
    </section>
  );
}
