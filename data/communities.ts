import type { CommunityInput } from "@/lib/validation/community";

// Launch communities — the named creative & industry AI groups from the
// site brief. Validated by communityInputSchema in the seed script; keep
// this file data-only. These are global (no city/country) umbrella groups.
export const LAUNCH_COMMUNITIES: {
  name: string;
  type: CommunityInput["type"];
  category: NonNullable<CommunityInput["category"]>;
  description: string;
  imageUrl: string;
}[] = [
  // --- Creative AI groups ---
  {
    name: "AI Filmmakers",
    type: "CREATIVE",
    category: "FILM",
    imageUrl: "/communities/ai-filmmakers.jpg",
    description:
      "Directors, editors and storytellers using AI across pre-production, generation, VFX and post — screenings, breakdowns and build sessions.",
  },
  {
    name: "AI Music",
    type: "CREATIVE",
    category: "MUSIC",
    imageUrl: "/communities/ai-music.jpg",
    description:
      "Producers, artists and engineers experimenting with AI composition, sound design and live performance.",
  },
  {
    name: "AI Fashion",
    type: "CREATIVE",
    category: "FASHION",
    imageUrl: "/communities/ai-fashion.jpg",
    description:
      "Designers and brands applying AI to design, styling, virtual try-on and the fashion supply chain.",
  },
  {
    name: "AI Advertising",
    type: "CREATIVE",
    category: "ADVERTISING",
    imageUrl: "/communities/ai-advertising.jpg",
    description:
      "Marketers and creatives building AI-powered campaigns, content pipelines and brand worlds.",
  },

  // --- Industry groups ---
  {
    name: "AI Real Estate",
    type: "INDUSTRY",
    category: "REAL_ESTATE",
    imageUrl: "/communities/ai-real-estate.jpg",
    description:
      "Agents, brokers and proptech builders using AI for valuation, marketing and property operations.",
  },
  {
    name: "AI Legal",
    type: "INDUSTRY",
    category: "LEGAL",
    imageUrl: "/communities/ai-legal.jpg",
    description:
      "Lawyers and legal-ops teams applying AI to research, drafting, review and compliance.",
  },
  {
    name: "AI Finance",
    type: "INDUSTRY",
    category: "FINANCE",
    imageUrl: "/communities/ai-finance.jpg",
    description:
      "Analysts, traders and fintech builders putting AI to work on markets, risk and financial products.",
  },
  {
    name: "AI Architecture",
    type: "INDUSTRY",
    category: "ARCHITECTURE",
    imageUrl: "/communities/ai-architecture.jpg",
    description:
      "Architects and designers exploring generative design, visualization and AI-assisted planning.",
  },
  {
    name: "AI Construction",
    type: "INDUSTRY",
    category: "CONSTRUCTION",
    imageUrl: "/communities/ai-construction.jpg",
    description:
      "Builders, engineers and project teams using AI for estimating, scheduling and site intelligence.",
  },
  {
    name: "AI Healthcare",
    type: "INDUSTRY",
    category: "HEALTHCARE",
    imageUrl: "/communities/ai-healthcare.jpg",
    description:
      "Clinicians, researchers and healthtech teams applying AI to diagnostics, care delivery and operations.",
  },
  {
    name: "AI Telecom",
    type: "INDUSTRY",
    category: "TELECOM",
    imageUrl: "/communities/ai-telecom.jpg",
    description:
      "Network engineers and operators using AI for optimization, customer support and next-gen connectivity.",
  },
  {
    name: "AI Education",
    type: "INDUSTRY",
    category: "EDUCATION",
    imageUrl: "/communities/ai-education.jpg",
    description:
      "Educators, students and edtech builders rethinking learning with AI tutors, tools and curricula.",
  },
  {
    name: "AI Sustainability",
    type: "INDUSTRY",
    category: "SUSTAINABILITY",
    imageUrl: "/communities/ai-sustainability.jpg",
    description:
      "Climate and sustainability builders applying AI to energy, agriculture and the planet's hardest problems.",
  },
  {
    name: "AI Mobility",
    type: "INDUSTRY",
    category: "MOBILITY",
    imageUrl: "/communities/ai-mobility.jpg",
    description:
      "Teams working on autonomous systems, logistics and the future of how people and goods move.",
  },
  {
    name: "AI Consumer Products",
    type: "INDUSTRY",
    category: "CONSUMER_PRODUCTS",
    imageUrl: "/communities/ai-consumer-products.jpg",
    description:
      "Product and retail teams using AI across design, merchandising, personalization and demand.",
  },
];
