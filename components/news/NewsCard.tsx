import Image from "@/components/ui/AppImage";
import Link from "next/link";

import {
  formatPostDate,
  formatTag,
  readingTimeLabel,
} from "@/lib/news-format";

export type NewsCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  tags: string[];
  readingMinutes: number;
};

export function NewsCard({
  post,
  variant = "default",
}: {
  post: NewsCardPost;
  variant?: "default" | "featured";
}) {
  const featured = variant === "featured";
  return (
    <Link
      href={`/news/${post.slug}`}
      className={`group flex h-full flex-col border bg-panel transition-colors hover:border-volt/60 ${
        featured ? "border-volt/40 lg:flex-row" : "border-white/10"
      }`}
    >
      <div
        className={`relative aspect-video overflow-hidden bg-ink ${featured ? "lg:aspect-auto lg:w-3/5" : ""}`}
      >
        <div
          className="bg-halftone absolute right-0 top-0 z-10 size-20 opacity-40"
          aria-hidden
        />
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority={featured}
            sizes={
              featured
                ? "(min-width: 1024px) 60vw, 100vw"
                : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className={`absolute inset-0 flex items-center justify-center font-display text-outline-volt ${featured ? "text-9xl" : "text-6xl"}`}
          >
            {post.title.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div
        className={`flex flex-1 flex-col p-6 ${featured ? "lg:justify-center lg:p-10" : ""}`}
      >
        {featured && (
          <p className="mb-4 inline-flex w-fit bg-volt px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
            Featured
          </p>
        )}
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
          {formatPostDate(post)}
          <span className="text-muted">
            {" "}
            · {readingTimeLabel(post.readingMinutes)}
          </span>
        </p>
        <h2
          className={`mt-3 font-display uppercase leading-tight transition-colors group-hover:text-volt ${
            featured ? "text-3xl sm:text-5xl" : "text-2xl"
          }`}
        >
          {post.title}
        </h2>
        <p
          className={`mt-3 text-sm leading-relaxed text-muted ${featured ? "line-clamp-4 sm:text-base" : "line-clamp-3"}`}
        >
          {post.excerpt}
        </p>
        {post.tags.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-2 pt-5">
            {post.tags.slice(0, 3).map((t) => (
              <li
                key={t}
                className="border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted"
              >
                {formatTag(t)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
