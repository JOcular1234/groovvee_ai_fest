import { event, experiences, faqs, ticketTiers } from "@/data/event";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_TYPE_PLURALS,
} from "@/lib/validation/community";

// Verified GrooVVee knowledge for the chat assistant. Everything here must be
// sourced from confirmed project content — never dates, prices, deadlines or
// links that haven't been announced. When facts are pending announcement the
// text says so explicitly, so the model can say it too.

export type KnowledgeSection = { title: string; body: string };

const communityTypes = Object.values(COMMUNITY_TYPE_PLURALS).join(", ");
const communityCategories = COMMUNITY_CATEGORIES.map((c) => c.label).join(
  ", "
);

export function buildKnowledgeBase(): KnowledgeSection[] {
  return [
    {
      title: "About GrooVVee",
      body: [
        "GrooVVee is a global AI community and innovation ecosystem — student tribes, campus communities, creative groups and industry groups connected through events, competitions and shared curiosity.",
        "Its mission is to find the people building the future of AI — on campuses and in studios — connect them, and film what happens when they collide.",
        "The ecosystem spans city chapters from Minneapolis to Lagos, Accra to Nairobi, London and beyond. Local chapters gather every month for community events, hackathons and education sessions.",
      ].join("\n"),
    },
    {
      title: "GrooVVee AI Fest",
      body: [
        `${event.name} — ${event.tagline}`,
        event.description,
        "AI Fest is the flagship semi-annual festival of the GrooVVee ecosystem, with editions planned across the USA, Africa and the UK.",
        `Festival experiences include: ${experiences.map((e) => e.title).join(", ")}.`,
        `Current status: ${event.dateDisplay}; ${event.venue}; ${event.location}. When dates or venue are not yet announced, say so and point visitors to /events and /tickets for updates.`,
        `Tickets: ${ticketTiers.map((t) => `${t.name} (${t.price} — ${t.tag})`).join("; ")}. Ticket registration details are confirmed at /tickets.`,
      ].join("\n"),
    },
    {
      title: "Communities",
      body: [
        `GrooVVee communities come in four types: ${communityTypes}.`,
        `Named creative and industry groups include: ${communityCategories}.`,
        "Communities gather monthly in cities across the US, Africa and beyond — parties, hackathons and education sessions.",
        "Visitors can browse and join communities at /communities, and see where the community gathers on the campus heatmap there.",
      ].join("\n"),
    },
    {
      title: "Competitions & AI Hack Wars",
      body: [
        "AI Hack Wars is the flagship GrooVVee build competition: enter solo or as a team of up to three builders, build on camera over 30 days, survive three judged rounds — one winner takes the title and the prize.",
        "Application requirements: email, phone and school are required; major and graduation year are optional; applicants write four sentences about themselves; prior TV or contest experience is a plus, not a requirement.",
        "Beyond Hack Wars, GrooVVee runs open AI contests and community-vs-community showdowns — browse /competitions and /hack-wars for details and current status.",
      ].join("\n"),
    },
    {
      title: "Speakers",
      body: [
        "The speaker lineup for GrooVVee events is published at /speakers.",
        "Anyone interested in speaking can apply at /speakers/apply.",
      ].join("\n"),
    },
    {
      title: "Partnerships & sponsorship",
      body: [
        "Two sponsorship categories exist: Community City Events (monthly recurring visibility across local chapter events, hackathons and education sessions worldwide) and GrooVVee AI Fest (semi-annual flagship festival sponsorship, headline and category placements).",
        "Studio participation packages: Independent Studio at $700 per participation (exhibit and demo space, featured in event programme, community showcase listing); Established Studio at $5,000 per participation (premium exhibit placement, speaking slot consideration, featured partner listing, priority access to talent pipeline).",
        "Prospective partners get the full partnership deck by reaching out via /contact.",
      ].join("\n"),
    },
    {
      title: "Events & activities",
      body: [
        "GrooVVee events include monthly community city events, campus meetups, hackathons, education sessions and the semi-annual AI Fest.",
        "The full event directory lives at /events with a global calendar, list and map views. /events/cities lists events by city.",
        "Live event details (specific dates, venues, availability) are answered from published listings — if unsure of a specific fact, point visitors to the event page on /events.",
      ].join("\n"),
    },
    {
      title: "Participation & contact",
      body: [
        "Ways to take part: join a community (/communities), attend events (/events), get tickets (/tickets), enter competitions (/competitions, /hack-wars), apply to speak (/speakers/apply), partner or sponsor (/partnerships), follow updates (/news).",
        `Direct contact: /contact or email ${event.contactEmail}.`,
      ].join("\n"),
    },
    {
      title: "Frequently asked",
      body: faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
    },
  ];
}
