import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TopicForm } from "@/components/admin/TopicForm";
import { db, withDbRetry } from "@/lib/db";
import { getTopicById } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Edit Topic · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = await withDbRetry(() => getTopicById(db, id));
  if (!topic) notFound();

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Topics
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-none sm:text-5xl">
          Edit topic<span className="text-volt">.</span>
        </h1>
        <div className="mt-10">
          <TopicForm
            topic={{
              id: topic.id,
              title: topic.title,
              slug: topic.slug,
              description: topic.description,
              imageUrl: topic.imageUrl ?? "",
              published: topic.published,
              sortOrder: topic.sortOrder,
            }}
          />
        </div>
      </div>
    </section>
  );
}
