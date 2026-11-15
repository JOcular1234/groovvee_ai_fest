import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NewsCard } from "@/components/news/NewsCard";
import { Reveal } from "@/components/ui/Reveal";
import { formatTag } from "@/lib/news-format";
import { getNewsTags, getPublishedNewsPosts } from "@/lib/public/news";
import { slugify } from "@/lib/slug";
import { pageMetadata } from "@/lib/site";

type NewsSearchParams = Promise<{ page?: string; tag?: string }>;

function parseParams({ page, tag }: { page?: string; tag?: string }) {
  return {
    page: Math.max(1, Math.floor(Number(page)) || 1),
    tag: tag ? slugify(tag).slice(0, 32) || undefined : undefined,
  };
}

function newsHref(p: { page?: number; tag?: string }) {
  const params = new URLSearchParams();
  if (p.tag) params.set("tag", p.tag);
  if (p.page && p.page > 1) params.set("page", String(p.page));
  const s = params.toString();
  return `/news${s ? `?${s}` : ""}`;
}

// Every listing page is its own canonical (page 2 is not a duplicate of
// page 1), so crawlers can reach older posts through pagination.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: NewsSearchParams;
}): Promise<Metadata> {
  const { page, tag } = parseParams(await searchParams);
  const label = tag ? `News: ${formatTag(tag)}` : "News";
  return pageMetadata({
    title: page > 1 ? `${label} (page ${page})` : label,
    description: tag
      ? `GrooVVee AI Fest news tagged “${formatTag(tag)}”.`
      : "AI news, discoveries and dispatches from across the GrooVVee ecosystem.",
    path: newsHref({ page, tag }),
  });
}

// Paginated via searchParams — renders per request over cached queries.
export const instant = false;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: NewsSearchParams;
}) {
  const { page: requested, tag } = parseParams(await searchParams);
  const [{ featured, posts, total, page, pages }, tags] = await Promise.all([
    getPublishedNewsPosts(requested, tag),
    getNewsTags(),
  ]);

  // Past the last page: send readers to the last real page rather than
  // showing a misleading "no posts" state.
  if (requested > pages) redirect(newsHref({ page: pages, tag }));

  const showFeatured = featured && page === 1;
  const nothing = posts.length === 0 && !showFeatured;

  const chip = (active: boolean) =>
    `border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
      active
        ? "border-volt bg-volt text-ink"
        : "border-white/15 text-muted hover:border-volt hover:text-volt"
    }`;

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Signal, not noise
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-7xl">
          News<span className="text-volt">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted">
          AI news, discoveries and dispatches from across the Groovvee
          ecosystem.
        </p>

        {tags.length > 0 && (
          <nav aria-label="Filter by tag" className="mt-10">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href="/news" className={chip(!tag)}>
                  All
                </Link>
              </li>
              {tags.map(({ tag: t, count }) => (
                <li key={t}>
                  <Link
                    href={newsHref({ tag: t })}
                    className={chip(t === tag)}
                    aria-current={t === tag ? "page" : undefined}
                  >
                    {formatTag(t)}
                    <span className="ml-1.5 opacity-60">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {nothing ? (
          <div className="mt-16 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {tag ? "Nothing here yet" : "The newsroom is warming up"}
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              {tag ? (
                <>
                  No posts tagged “{formatTag(tag)}”.{" "}
                  <Link href="/news" className="text-volt hover:text-white">
                    See all news
                  </Link>
                  .
                </>
              ) : (
                "No posts published yet — check back soon for AI news and discoveries from the Groovvee community."
              )}
            </p>
          </div>
        ) : (
          <>
            {showFeatured && (
              <div className="mt-12">
                <Reveal>
                  <NewsCard post={featured} variant="featured" />
                </Reveal>
              </div>
            )}

            {posts.length > 0 && (
              <div
                className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${showFeatured ? "mt-6" : "mt-12"}`}
              >
                {posts.map((post, i) => (
                  <Reveal key={post.id} delay={0.06 * (i % 3)}>
                    <NewsCard post={post} />
                  </Reveal>
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="mt-10 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
                <Link
                  href={newsHref({ page: page - 1, tag })}
                  aria-disabled={page <= 1}
                  className={`border px-4 py-2 ${
                    page <= 1
                      ? "pointer-events-none border-white/10 text-muted/40"
                      : "border-white/25 text-white hover:border-volt hover:text-volt"
                  }`}
                >
                  ← Prev
                </Link>
                <span className="text-muted">
                  Page {page} of {pages} · {total + (featured ? 1 : 0)} posts
                </span>
                <Link
                  href={newsHref({ page: page + 1, tag })}
                  aria-disabled={page >= pages}
                  className={`border px-4 py-2 ${
                    page >= pages
                      ? "pointer-events-none border-white/10 text-muted/40"
                      : "border-white/25 text-white hover:border-volt hover:text-volt"
                  }`}
                >
                  Next →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
