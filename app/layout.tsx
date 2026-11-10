import type { Metadata } from "next";
import { Anton, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Groovvee AI Fest — Where Creativity Meets Artificial Intelligence",
    template: "%s — Groovvee AI Fest",
  },
  description:
    "Groovvee AI Fest brings together curious minds, innovators, developers, creatives and entrepreneurs to explore how artificial intelligence is transforming the world.",
  openGraph: {
    title: "Groovvee AI Fest",
    description:
      "Where Creativity Meets Artificial Intelligence. Explore the possibilities of AI, connect with innovators and experience the future being built.",
    type: "website",
    siteName: "Groovvee AI Fest",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
