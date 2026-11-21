import { ArrowUpRight } from "lucide-react";
import Image from "@/components/ui/AppImage";
import Link from "next/link";

import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getFeaturedCommunities } from "@/lib/public/communities";
import {
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_TYPE_LABELS,
} from "@/lib/validation/community";

export async function FeaturedCommunities() {
  const communities = await getFeaturedCommunities();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          dark
          eyebrow="Communities"
          title={
            <>
              Find your{" "}
              <span className="bg-volt px-2 text-ink">tribe.</span>
            </>
          }
          action={
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink underline decoration-volt decoration-2 underline-offset-4 transition-colors hover:bg-volt"
            >
              Explore communities
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          }
        />

        {communities.length === 0 ? (
          <div className="mt-14 border border-ink/15 bg-white/95 p-10 text-center backdrop-blur-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Communities launching soon
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c, i) => (
              <Reveal key={c.id} delay={0.07 * i}>
                <Link
                  href={`/communities/${c.slug}`}
                  className="group flex h-full flex-col border border-ink/15 bg-white/95 backdrop-blur-sm transition-colors hover:border-ink/40"
                >
                  <div className="relative aspect-video overflow-hidden bg-ink">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center font-display text-6xl text-outline-volt"
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="w-fit bg-volt px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
                      {(c.category && COMMUNITY_CATEGORY_LABELS[c.category]) ??
                        COMMUNITY_TYPE_LABELS[c.type] ??
                        c.type}
                    </p>
                    <h3 className="mt-3 font-display text-2xl uppercase leading-tight text-ink transition-colors group-hover:underline group-hover:decoration-volt group-hover:decoration-[0.08em] group-hover:underline-offset-4">
                      {c.name}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/60">
                      {c.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
