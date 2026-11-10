import Link from "next/link";
import { event, navLinks, socials } from "@/data/event";

const socialMarks: Record<string, string> = {
  Instagram: "IG",
  X: "X",
  LinkedIn: "IN",
  YouTube: "YT",
};

export async function Footer() {
  "use cache";
  return (
    <footer className="relative overflow-hidden border-t-2 border-volt bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl uppercase leading-none">
              Groovvee
              <span className="text-volt"> AI Fest</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {event.tagline} A festival for the curious — exploring how
              artificial intelligence is transforming the world around us.
            </p>
            <div className="mt-6 flex gap-3">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center border border-white/15 font-mono text-[10px] font-bold tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
                >
                  {socialMarks[social.label] ?? social.label[0]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Explore
            </h3>
            <ul className="mt-5 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Contact
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              <li>
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="transition-colors hover:text-white"
                >
                  {event.contactEmail}
                </a>
              </li>
              <li>{event.venue}</li>
              <li>{event.location}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <p>© {new Date().getFullYear()} Groovvee AI Fest</p>
          <p>Built for the AI-curious</p>
        </div>
      </div>

      <p
        aria-hidden
        className="text-outline-faint pointer-events-none select-none whitespace-nowrap text-center font-display text-[18vw] uppercase leading-[0.8] translate-y-[15%]"
      >
        Groovvee
      </p>
    </footer>
  );
}
