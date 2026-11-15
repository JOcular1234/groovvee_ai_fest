import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NewsArticle } from "@/components/news/NewsArticle";
import { NewsCard } from "@/components/news/NewsCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { getLatestNewsPosts, getNewsPostBySlug } from "@/lib/public/news";
import { articleJsonLd } from "@/lib/seo/article-json-ld";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) return { title: "News" };
  const path = `/news/${post.slug}`;
  // Not pageMetadata(): without a cover, openGraph.images must be left unset
  // so the generated card in ./opengraph-image.tsx is used.
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: path },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: path,
      type: "article",
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      ...(post.authorName && { authors: [post.authorName] }),
      ...(post.tags.length > 0 && { tags: post.tags }),
      ...(post.coverImageUrl && { images: [{ url: post.coverImageUrl }] }),
    },
  };
}

// Dynamic slug params — renders per request over cached queries.
export const instant = false;

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

  const latest = await getLatestNewsPosts(post.id, 3);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <JsonLd data={articleJsonLd(post)} />
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All news
        </Link>

        <NewsArticle post={post} shareUrl={absoluteUrl(`/news/${post.slug}`)} />

        {latest.length > 0 && (
          <div className="mt-20">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Latest news
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
