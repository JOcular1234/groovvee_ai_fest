import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Tickets",
  description:
    "Tickets and passes for GrooVVee AI Fest — festival access, community events and sponsorship packages.",
  path: "/tickets",
});

export default function TicketsPage() {
  return (
    <PagePlaceholder
      title="Tickets"
      description="Ticket registration opens soon — including a free Community Pass. Check back or follow along for the announcement."
    />
  );
}
