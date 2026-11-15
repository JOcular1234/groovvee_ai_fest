import { ArrowUpRight } from "lucide-react";
import Image from "@/components/ui/AppImage";
import Link from "next/link";

import { PostBody } from "@/components/news/PostBody";
import { ShareButtons } from "@/components/news/ShareButtons";
import type { PublicNewsPost } from "@/lib/news";
import {
  formatPostDate,
  formatTag,
  readingTimeLabel,
} from "@/lib/news-format";

// The article itself — shared by the public post page and the admin
// preview so a preview is exactly what readers will see.
export function NewsArticle({
  post,
  shareUrl,
}: {
  post: PublicNewsPost;
  shareUrl: string;
}) {
  return (
    <article>
      <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
        <span className="inline-block size-2 bg-volt" aria-hidden />
        <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
          {formatPostDate(post)}
        </time>
        <span className="text-muted">
          · {readingTimeLabel(post.readingMinutes)}
        </span>
        {post.authorName && (
          <span className="text-muted">· {post.authorName}</span>
        )}
      </p>
      <h1 className="mt-5 font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
        {post.title}
      </h1>

      {post.tags.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <li key={t}>
              <Link
                href={`/news?tag=${encodeURIComponent(t)}`}
                className="inline-block border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors hover:border-volt hover:text-volt"
              >
                {formatTag(t)}
              </Link>
            </li>
          ))}
        </ul>
      )}

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
      <div className="mt-6">
        <PostBody body={post.body} />
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

      <div className="mt-12 border-t border-white/10 pt-8">
        <ShareButtons url={shareUrl} title={post.title} />
      </div>
    </article>
  );
}
