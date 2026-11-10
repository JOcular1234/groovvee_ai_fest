// Editable content for Groovvee AI Fest.
// Replace placeholder values with confirmed event details as they are announced.
// Speaker profiles are samples only — no real people are represented.

export const event = {
  name: "Groovvee AI Fest",
  tagline: "Where Creativity Meets Artificial Intelligence.",
  description:
    "Explore the possibilities of AI, connect with innovators, discover emerging technologies and experience the future being built right before your eyes.",
  // ISO 8601 datetime, e.g. "2027-03-14T09:00:00". null = date not yet announced.
  startDate: null as string | null,
  dateDisplay: "Date to be announced",
  venue: "Venue to be announced",
  location: "Location to be announced",
  contactEmail: "hello@example.com", // TODO: replace with real contact email
};

// Main navigation — the logo already links Home, so it's omitted here.
export const navLinks = [
  { label: "About", href: "/about" },
  { label: "Communities", href: "/communities" },
  { label: "Events", href: "/events" },
  { label: "Competitions", href: "/competitions" },
  { label: "Speakers", href: "/speakers" },
  { label: "Partnerships", href: "/partnerships" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

// Configurable placeholders — replace href values with real profiles.
export const socials = [
  { label: "Instagram", href: "#" },
  { label: "X", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "YouTube", href: "#" },
];

export const tickerItems = [
  "Artificial Intelligence",
  "Generative AI",
  "Machine Learning",
  "Creative Technology",
  "The Future of Work",
  "AI Innovation",
  "Emerging Tech",
  "Builders & Dreamers",
];

export const highlights = [
  {
    index: "01",
    title: "Learn",
    description:
      "Discover AI tools, technologies and practical applications through talks, sessions and workshops.",
  },
  {
    index: "02",
    title: "Connect",
    description:
      "Meet developers, entrepreneurs, professionals and other people passionate about technology.",
  },
  {
    index: "03",
    title: "Build",
    description:
      "Explore ideas, experiment with AI and discover opportunities to create something meaningful.",
  },
];

// Speakers are served from the database (see /admin/speakers and /speakers).

// Topics are served from the database (see /admin/topics and /topics).

export const experiences = [
  {
    title: "Keynote Presentations",
    description: "Big ideas from the main stage.",
    icon: "Presentation",
  },
  {
    title: "Expert Discussions",
    description: "Panels and conversations with people building with AI.",
    icon: "MessagesSquare",
  },
  {
    title: "Interactive Workshops",
    description: "Hands-on sessions where you build, not just listen.",
    icon: "FlaskConical",
  },
  {
    title: "Networking Opportunities",
    description: "Meet the community — students, builders and founders.",
    icon: "Users",
  },
  {
    title: "Live Demonstrations",
    description: "See AI tools and experiments running in real time.",
    icon: "Zap",
  },
  {
    title: "AI Innovation Showcases",
    description: "Projects and prototypes from emerging builders.",
    icon: "Lightbulb",
  },
];

export const ticketTiers = [
  {
    name: "Community Pass",
    price: "Free",
    tag: "Free registration",
    description: "Get in the door and experience the festival atmosphere.",
    benefits: [
      "Access to the festival floor",
      "Open sessions and showcases",
      "Community networking",
    ],
    cta: "Register Free",
  },
  {
    name: "Festival Pass",
    price: "Price TBA",
    tag: "Full access",
    description: "The complete Groovvee AI Fest experience.",
    benefits: [
      "Everything in Community Pass",
      "Workshops and premium sessions",
      "Priority access and festival perks",
    ],
    cta: "Get Your Ticket",
  },
];

export const sponsorSlots = 6;

export const faqs = [
  {
    question: "What is Groovvee AI Fest?",
    answer:
      "Groovvee AI Fest is a technology festival bringing together curious minds, innovators, developers, creatives and entrepreneurs to explore how artificial intelligence is transforming the world around us.",
  },
  {
    question: "Who can attend?",
    answer:
      "Anyone curious about AI and technology — students, developers, tech professionals, entrepreneurs and creatives. Full attendance details will be shared when registration opens.",
  },
  {
    question: "Do I need an AI background to participate?",
    answer:
      "No. The festival is designed for all levels — whether you're exploring AI for the first time or already building with it, there will be content for you.",
  },
  {
    question: "How can I get a ticket?",
    answer:
      "Ticket registration will open soon. Head to the tickets page or hit the Get Your Ticket button to register your interest — final details are being confirmed.",
  },
  {
    question: "Are free tickets available?",
    answer:
      "Yes — a free Community Pass registration option is planned. Details will be confirmed when tickets go live.",
  },
  {
    question: "Where will the event take place?",
    answer:
      "The venue and location will be announced soon. Sign up or follow along to be the first to know.",
  },
];
