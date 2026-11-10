import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <PagePlaceholder
      title="About"
      eyebrow="Who we are"
      description="Groovvee is a global AI ecosystem — connecting student tribes, campus communities, creators and industry groups through events, competitions and shared curiosity. Our mission and story are being written here."
      cta={{ label: "Explore Communities", href: "/communities" }}
    />
  );
}
