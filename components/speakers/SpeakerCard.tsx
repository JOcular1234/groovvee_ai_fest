import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { socialLinkSchema } from "@/lib/validation/speaker";
import { z } from "zod";

export type PublicSpeaker = {
  id: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  imageUrl: string | null;
  socials: unknown;
};

const socialsSchema = z.array(socialLinkSchema);

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

export function SpeakerCard({
  speaker,
  index = 0,
  showBio = true,
}: {
  speaker: PublicSpeaker;
  index?: number;
  showBio?: boolean;
}) {
  const socials = socialsSchema.safeParse(speaker.socials).success
    ? socialsSchema.parse(speaker.socials)
    : [];

  return (
    <article className="group">
      <div className="relative aspect-3/4 overflow-hidden border border-white/10 bg-ink">
        <div
          className="bg-halftone absolute right-0 top-0 z-10 size-24 opacity-40"
          aria-hidden
        />
        <span
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center font-display text-8xl transition-transform duration-500 group-hover:scale-110 ${
            index % 2 === 0 ? "text-volt" : "text-outline-volt"
          }`}
        >
          {initials(speaker.name)}
        </span>
        {speaker.imageUrl && (
          <Image
            src={speaker.imageUrl}
            alt={speaker.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink via-ink/80 to-transparent p-5 pt-12">
          <h3 className="font-display text-2xl uppercase leading-none">
            {speaker.name}
          </h3>
          {speaker.title && (
            <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt">
              {speaker.title}
            </p>
          )}
        </div>
      </div>
      {speaker.organization && (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {speaker.organization}
        </p>
      )}
      {showBio && speaker.bio && (
        <p className="mt-2 text-sm leading-relaxed text-muted">{speaker.bio}</p>
      )}
      {socials.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:text-volt"
              >
                {s.label}
                <ArrowUpRight className="size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
