import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { NavbarVisibility } from "@/components/layout/NavbarVisibility";
import { Footer } from "@/components/layout/Footer";
import { FooterVisibility } from "@/components/layout/FooterVisibility";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, absoluteUrl, getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/groovveelogo.png"),
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      publisher: { "@id": absoluteUrl("/#organization") },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">
        <JsonLd data={siteJsonLd} />
        <Providers>
          <NavbarVisibility>
            <Navbar />
          </NavbarVisibility>
          <main className="flex-1">{children}</main>
          <FooterVisibility>
            <Footer />
            <CookieNotice />
          </FooterVisibility>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
