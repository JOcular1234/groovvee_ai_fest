import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Partnerships",
};

export default function PartnershipsPage() {
  return (
    <PagePlaceholder
      title="Partnerships"
      eyebrow="Build with us"
      description="Monthly community sponsorships, semi-annual festival sponsorships and studio participation — three ways to put your brand inside the Groovvee ecosystem. Packages drop soon."
      cta={{ label: "Get in Touch", href: "/contact" }}
    />
  );
}
