import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";

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
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">
            Edit post<span className="text-volt">.</span>
          </h1>
          <Link
            href={`/admin/news/${post.id}/preview`}
            className="inline-flex items-center gap-2 border border-white/25 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            <Eye className="size-4" aria-hidden />
            Preview saved version
          </Link>
        </div>
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
              publishedAt: post.publishedAt?.toISOString() ?? "",
              featured: post.featured,
              tags: post.tags.join(", "),
            }}
          />
        </div>
      </div>
    </section>
  );
}
