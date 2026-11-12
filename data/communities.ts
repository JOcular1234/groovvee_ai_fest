import type { CommunityInput } from "@/lib/validation/community";

// Launch communities — the named creative & industry AI groups from the
// site brief. Validated by communityInputSchema in the seed script; keep
// this file data-only. These are global (no city/country) umbrella groups.
export const LAUNCH_COMMUNITIES: {
  name: string;
  type: CommunityInput["type"];
  category: NonNullable<CommunityInput["category"]>;
  description: string;
}[] = [
  // --- Creative AI groups ---
  {
    name: "AI Filmmakers",
    type: "CREATIVE",
    category: "FILM",
    description:
      "Directors, editors and storytellers using AI across pre-production, generation, VFX and post — screenings, breakdowns and build sessions.",
  },
  {
    name: "AI Music",
    type: "CREATIVE",
    category: "MUSIC",
    description:
      "Producers, artists and engineers experimenting with AI composition, sound design and live performance.",
  },
  {
    name: "AI Fashion",
    type: "CREATIVE",
    category: "FASHION",
    description:
      "Designers and brands applying AI to design, styling, virtual try-on and the fashion supply chain.",
  },
  {
    name: "AI Advertising",
    type: "CREATIVE",
    category: "ADVERTISING",
    description:
      "Marketers and creatives building AI-powered campaigns, content pipelines and brand worlds.",
  },

  // --- Industry groups ---
  {
    name: "AI Real Estate",
    type: "INDUSTRY",
    category: "REAL_ESTATE",
    description:
      "Agents, brokers and proptech builders using AI for valuation, marketing and property operations.",
  },
  {
    name: "AI Legal",
    type: "INDUSTRY",
    category: "LEGAL",
    description:
      "Lawyers and legal-ops teams applying AI to research, drafting, review and compliance.",
  },
  {
    name: "AI Finance",
    type: "INDUSTRY",
    category: "FINANCE",
    description:
      "Analysts, traders and fintech builders putting AI to work on markets, risk and financial products.",
  },
  {
    name: "AI Architecture",
    type: "INDUSTRY",
    category: "ARCHITECTURE",
    description:
      "Architects and designers exploring generative design, visualization and AI-assisted planning.",
  },
  {
    name: "AI Construction",
    type: "INDUSTRY",
    category: "CONSTRUCTION",
    description:
      "Builders, engineers and project teams using AI for estimating, scheduling and site intelligence.",
  },
  {
    name: "AI Healthcare",
    type: "INDUSTRY",
    category: "HEALTHCARE",
    description:
      "Clinicians, researchers and healthtech teams applying AI to diagnostics, care delivery and operations.",
  },
  {
    name: "AI Telecom",
    type: "INDUSTRY",
    category: "TELECOM",
    description:
      "Network engineers and operators using AI for optimization, customer support and next-gen connectivity.",
  },
  {
    name: "AI Education",
    type: "INDUSTRY",
    category: "EDUCATION",
    description:
      "Educators, students and edtech builders rethinking learning with AI tutors, tools and curricula.",
  },
  {
    name: "AI Sustainability",
    type: "INDUSTRY",
    category: "SUSTAINABILITY",
    description:
      "Climate and sustainability builders applying AI to energy, agriculture and the planet's hardest problems.",
  },
  {
    name: "AI Mobility",
    type: "INDUSTRY",
    category: "MOBILITY",
    description:
      "Teams working on autonomous systems, logistics and the future of how people and goods move.",
  },
  {
    name: "AI Consumer Products",
    type: "INDUSTRY",
    category: "CONSUMER_PRODUCTS",
    description:
      "Product and retail teams using AI across design, merchandising, personalization and demand.",
  },
];
