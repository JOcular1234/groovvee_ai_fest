import type { PublicNewsPost } from "@/lib/news";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

// schema.org NewsArticle for Google article rich results / Top Stories.
// See developers.google.com/search/docs/appearance/structured-data/article
export function articleJsonLd(post: PublicNewsPost): Record<string, unknown> {
  const url = absoluteUrl(`/news/${post.slug}`);
  const publisher = {
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/groovveelogo.png") },
  };
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title.slice(0, 110),
    description: post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // Falls back to the generated share card (app/news/[slug]/opengraph-image).
    image: [
      absoluteUrl(post.coverImageUrl ?? `/news/${post.slug}/opengraph-image`),
    ],
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.authorName
      ? { "@type": "Person", name: post.authorName }
      : publisher,
    publisher,
    ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
    ...(post.sourceUrl && { isBasedOn: post.sourceUrl }),
  };
}
