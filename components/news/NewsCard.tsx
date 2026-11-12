import Image from "next/image";
import Link from "next/link";

export type NewsCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export function formatPostDate(post: {
  publishedAt: Date | null;
  createdAt: Date;
}) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(post.publishedAt ?? post.createdAt);
}

export function NewsCard({ post }: { post: NewsCardPost }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex h-full flex-col border border-white/10 bg-panel transition-colors hover:border-volt/60"
    >
      <div className="relative aspect-video overflow-hidden bg-ink">
        <div
          className="bg-halftone absolute right-0 top-0 z-10 size-20 opacity-40"
          aria-hidden
        />
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-display text-6xl text-outline-volt"
          >
            {post.title.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
          {formatPostDate(post)}
          {post.authorName && (
            <span className="text-muted"> · {post.authorName}</span>
          )}
        </p>
        <h2 className="mt-3 font-display text-2xl uppercase leading-tight transition-colors group-hover:text-volt">
          {post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}
