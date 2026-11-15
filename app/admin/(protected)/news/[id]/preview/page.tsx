import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Pencil } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { NewsArticle } from "@/components/news/NewsArticle";
import { db, withDbRetry } from "@/lib/db";
import { newsPostStatus, queryNewsPostForPreview } from "@/lib/news";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Preview Post · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const STATUS_COPY = {
  draft: "Draft: not visible to the public.",
  scheduled: "Scheduled: goes live automatically on",
  published: "Published: this post is live.",
} as const;

// Access: the section layout already requires news "view" permission.
export default async function PreviewNewsPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const post = await withDbRetry(() => queryNewsPostForPreview(db, id));
  if (!post) notFound();

  const status = newsPostStatus(post);
  const actionClass =
    "inline-flex items-center gap-2 border border-white/25 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt";

  return (
    <section className="relative overflow-hidden px-5 py-10 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-volt/30 bg-volt/10 px-5 py-4">
          <p className="text-sm text-volt">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
              Preview
            </span>{" "}
            · {STATUS_COPY[status]}
            {status === "scheduled" &&
              post.publishedAt &&
              ` ${post.publishedAt.toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })} UTC.`}
            {post.featured && " Featured on /news."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/news" className={actionClass}>
              <ArrowLeft className="size-3.5" aria-hidden />
              All posts
            </Link>
            <Link href={`/admin/news/${post.id}/edit`} className={actionClass}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Link>
            {status === "published" && (
              <Link
                href={`/news/${post.slug}`}
                target="_blank"
                className={actionClass}
              >
                View live
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        <NewsArticle post={post} shareUrl={absoluteUrl(`/news/${post.slug}`)} />
      </div>
    </section>
  );
}
