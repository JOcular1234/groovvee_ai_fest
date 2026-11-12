import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPostDate, NewsCard } from "@/components/news/NewsCard";
import { getLatestNewsPosts, getNewsPostBySlug } from "@/lib/public/news";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) return { title: "News" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      ...(post.coverImageUrl
        ? { images: [{ url: post.coverImageUrl }] }
        : {}),
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
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All news
        </Link>

        <p className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          {formatPostDate(post)}
          {post.authorName && (
            <span className="text-muted">· {post.authorName}</span>
          )}
        </p>
        <h1 className="mt-5 font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
          {post.title}
        </h1>

        <div className="relative mt-10 aspect-video overflow-hidden border border-white/10 bg-ink">
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-display text-9xl text-outline-volt"
            >
              {post.title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <p className="mt-8 text-lg leading-relaxed text-white/90">
          {post.excerpt}
        </p>
        <div className="mt-6 whitespace-pre-line leading-relaxed text-muted">
          {post.body}
        </div>

        {post.sourceUrl && (
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2 border border-white/25 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
          >
            Read the original story
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        )}

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
