import { ImageResponse } from "next/og";

import { OgFrame, OG_SIZE, ogColors, ogFonts } from "@/lib/seo/og-image";

export const alt = "Groovvee AI Fest — Where Creativity Meets Artificial Intelligence";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame kicker="Groovvee AI Fest">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Anton",
            textTransform: "uppercase",
            lineHeight: 0.95,
          }}
        >
          <div style={{ color: "white", fontSize: 118 }}>Where creativity</div>
          <div style={{ color: "white", fontSize: 118, display: "flex" }}>
            meets&nbsp;<span style={{ color: ogColors.volt }}>AI.</span>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: [...await ogFonts()] }
  );
}
