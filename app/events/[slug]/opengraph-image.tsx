import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { formatEventDateTime } from "@/lib/datetime";
import { getEventBySlug } from "@/lib/public/events";
import { OgFrame, OG_SIZE, ogColors, ogFonts } from "@/lib/seo/og-image";

export const alt = "Groovvee AI Fest event";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const where = event.isOnline
    ? "Online"
    : [event.city, event.country].filter(Boolean).join(", ") ||
      "Location TBA";
  const when = formatEventDateTime(event.startsAt, event.timezone);

  // Anton is a tall condensed face — shrink as titles grow so two lines fit.
  const titleSize = event.title.length > 64 ? 56 : event.title.length > 40 ? 68 : 84;

  return new ImageResponse(
    (
      <OgFrame
        kicker={event.isOnline ? "Online event" : "Groovvee AI Fest event"}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              color: "white",
              fontSize: titleSize,
              fontFamily: "Anton",
              textTransform: "uppercase",
              lineHeight: 1.02,
            }}
          >
            {event.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 36,
              fontSize: 26,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            <div style={{ color: ogColors.volt }}>{when}</div>
            <div style={{ color: ogColors.muted }}>{where}</div>
          </div>
          {event.community && (
            <div
              style={{
                color: ogColors.muted,
                fontSize: 22,
                marginTop: 18,
                letterSpacing: 1,
                display: "flex",
              }}
            >
              Hosted by&nbsp;{event.community.name}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: [...await ogFonts()] }
  );
}
