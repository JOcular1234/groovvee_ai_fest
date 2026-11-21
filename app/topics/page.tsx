import Image from "@/components/ui/AppImage";

import { CollageBackground } from "@/components/ui/CollageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedTopics } from "@/lib/public/topics";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Topics",
  description:
    "The AI topics explored at GrooVVee AI Fest — from generative AI and machine learning to creative technology and the future of work.",
  path: "/topics",
});

export default async function TopicsPage() {
  const topics = await getPublishedTopics();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-7xl">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          Program
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-7xl">
          <span className="bg-volt px-2 text-ink">Topics.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-medium text-ink/70">
          The subject tracks running through Groovvee AI Fest — talks,
          workshops and conversations built around each one.
        </p>

        {topics.length === 0 ? (
          <div className="mt-16 border border-ink/15 bg-white/95 p-12 text-center backdrop-blur-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
              Announcements coming
            </p>
            <p className="mx-auto mt-4 max-w-md text-ink/70">
              We&apos;re curating the full program of talks, workshops and
              sessions. The complete topic list drops soon.
            </p>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, i) => (
              <Reveal key={topic.id} delay={0.06 * (i % 3)}>
                <article className="group flex h-full flex-col border border-ink/15 bg-white/95 backdrop-blur-sm transition-colors hover:border-ink/40">
                  <div className="relative aspect-video overflow-hidden bg-ink">
                    <div
                      className="bg-halftone absolute right-0 top-0 z-10 size-24 opacity-40"
                      aria-hidden
                    />
                    {topic.imageUrl ? (
                      <Image
                        src={topic.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center font-display text-7xl text-outline-volt"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="w-fit bg-volt px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
                      T.{String(i + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 font-display text-2xl uppercase leading-tight text-ink">
                      {topic.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">
                      {topic.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
