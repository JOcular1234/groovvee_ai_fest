import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Tickets",
};

export default function TicketsPage() {
  return (
    <PagePlaceholder
      title="Tickets"
      description="Ticket registration opens soon — including a free Community Pass. Check back or follow along for the announcement."
    />
  );
}
