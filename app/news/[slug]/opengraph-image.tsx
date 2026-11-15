import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { formatPostDate, formatTag } from "@/lib/news-format";
import { getNewsPostBySlug } from "@/lib/public/news";
import { OgFrame, OG_SIZE, ogColors, ogFonts } from "@/lib/seo/og-image";

export const alt = "Groovvee AI Fest news";
export const size = OG_SIZE;
export const contentType = "image/png";

// Used only for posts without a cover image — page metadata supplies the
// cover as og:image when there is one, which takes precedence.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

  const titleSize = post.title.length > 70 ? 56 : post.title.length > 40 ? 68 : 84;
  const tag = post.tags[0];

  return new ImageResponse(
    (
      <OgFrame kicker={tag ? `News · ${formatTag(tag)}` : "Groovvee News"}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "white",
              fontSize: titleSize,
              fontFamily: "Anton",
              textTransform: "uppercase",
              lineHeight: 1.02,
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 36,
              fontSize: 26,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            <div style={{ color: ogColors.volt }}>{formatPostDate(post)}</div>
            <div style={{ color: ogColors.muted }}>
              {post.readingMinutes} min read
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: [...(await ogFonts())] }
  );
}
