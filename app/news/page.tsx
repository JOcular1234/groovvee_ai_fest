import type { Metadata } from "next";
import Link from "next/link";

import { NewsCard } from "@/components/news/NewsCard";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedNewsPosts } from "@/lib/public/news";

export const metadata: Metadata = {
  title: "News",
  description:
    "AI news, discoveries and dispatches from across the GrooVVee ecosystem.",
};

// Paginated via searchParams — renders per request over cached queries.
export const instant = false;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const { posts, total, page, pages } = await getPublishedNewsPosts(
    Math.max(1, Number(pageParam) || 1)
  );

  const pageHref = (p: number) => `/news${p > 1 ? `?page=${p}` : ""}`;

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

        {posts.length === 0 ? (
          <div className="mt-16 border border-white/10 bg-panel p-12 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              The newsroom is warming up
            </p>
            <p className="mx-auto mt-4 max-w-md text-muted">
              No posts published yet — check back soon for AI news and
              discoveries from the Groovvee community.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.id} delay={0.06 * (i % 3)}>
                  <NewsCard post={post} />
                </Reveal>
              ))}
            </div>

            {pages > 1 && (
              <div className="mt-10 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
                <Link
                  href={pageHref(page - 1)}
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
                  Page {page} of {pages} · {total} posts
                </span>
                <Link
                  href={pageHref(page + 1)}
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
