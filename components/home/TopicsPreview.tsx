import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { getHomepageTopics } from "@/lib/public/topics";

// Asymmetric editorial layout: topic 0 and the CTA tile span two columns.
const spans = [
  "lg:col-span-2",
  "",
  "",
  "",
  "lg:col-span-2",
  "",
  "",
];

export async function TopicsPreview() {
  const topics = await getHomepageTopics();

  return (
    <section className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Festival topics"
          title={
            <>
              What we&apos;re <span className="text-volt">exploring.</span>
            </>
          }
        />

        <div className="mt-14 grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic, i) => (
            <div
              key={topic.id}
              className={`group relative flex min-h-48 flex-col justify-between bg-ink p-6 transition-colors duration-300 hover:bg-volt sm:min-h-56 ${spans[i % spans.length]}`}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted transition-colors group-hover:text-ink/60">
                T.{String(i + 1).padStart(2, "0")}
              </span>
              <div className="mt-8">
                <h3 className="font-display text-xl uppercase leading-tight transition-colors group-hover:text-ink sm:text-2xl">
                  {topic.title}
                </h3>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted transition-colors group-hover:text-ink/70">
                  {topic.description}
                </p>
              </div>
            </div>
          ))}

          {topics.length === 0 && (
            <div className="flex min-h-48 items-center justify-center bg-ink p-6 sm:min-h-56 lg:col-span-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                Program to be announced
              </p>
            </div>
          )}

          <Link
            href="/topics"
            className="group flex min-h-48 items-center justify-between gap-4 bg-volt p-6 transition-colors hover:bg-white sm:min-h-56 lg:col-span-2"
          >
            <span className="font-display text-2xl uppercase leading-tight text-ink sm:text-3xl">
              Explore
              <br />
              all topics
            </span>
            <ArrowUpRight
              className="size-10 shrink-0 text-ink transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
