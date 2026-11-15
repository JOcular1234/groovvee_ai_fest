import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

import { getSiteUrl } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const fontsDir = join(process.cwd(), "assets/fonts");

// Static TTFs only — satori can't read woff2 (which is all next/font emits).
export async function ogFonts() {
  const [anton, grotesk] = await Promise.all([
    readFile(join(fontsDir, "Anton-Regular.ttf")),
    readFile(join(fontsDir, "SpaceGrotesk-Medium.ttf")),
  ]);
  return [
    { name: "Anton", data: anton, weight: 400, style: "normal" },
    { name: "Space Grotesk", data: grotesk, weight: 400, style: "normal" },
  ] as const;
}

const ink = "#0b0b0b";
const panel = "#171717";
const volt = "#ffd600";
const muted = "#a3a3a3";

export const ogColors = { ink, panel, volt, muted };

export function siteHost(): string {
  return getSiteUrl().replace(/^https?:\/\//, "");
}

// Shared chrome: volt kicker row, volt bottom bar, host on the right.
// Children sit in the flexible middle zone.
export function OgFrame({
  kicker,
  children,
}: {
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: ink,
        fontFamily: "Space Grotesk",
        padding: "56px 64px 48px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 14, height: 14, backgroundColor: volt }} />
          <div
            style={{
              color: volt,
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
        </div>
        <div style={{ color: muted, fontSize: 20, letterSpacing: 2 }}>
          {siteHost()}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ width: 48, height: 6, backgroundColor: volt }} />
        <div
          style={{
            color: muted,
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Where Creativity Meets Artificial Intelligence
        </div>
      </div>
    </div>
  );
}
