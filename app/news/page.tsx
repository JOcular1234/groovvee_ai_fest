import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "News",
};

export default function NewsPage() {
  return (
    <PagePlaceholder
      title="News"
      eyebrow="Signal, not noise"
      description="AI news, discoveries and dispatches from across the Groovvee ecosystem. The newsroom is coming online soon."
      cta={{ label: "Explore Communities", href: "/communities" }}
    />
  );
}
