import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { event } from "@/data/event";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <PagePlaceholder
      title="Contact"
      eyebrow="Say hello"
      description={`Questions, partnerships, press or community ideas — reach the Groovvee team at ${event.contactEmail}. A full contact form is on the way.`}
      cta={{ label: `Email ${event.contactEmail}`, href: `mailto:${event.contactEmail}` }}
    />
  );
}
