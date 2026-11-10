import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Competitions",
};

export default function CompetitionsPage() {
  return (
    <PagePlaceholder
      title="Competitions"
      eyebrow="Prove it"
      description="AI Hack Wars, open AI contests and community-vs-community showdowns. Brackets, challenges and prizes are coming soon."
      cta={{ label: "Explore Communities", href: "/communities" }}
    />
  );
}
