import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageReviewPanel } from "@/components/admin/MessageReviewPanel";
import { db, withDbRetry } from "@/lib/db";
import { getMessageById, markMessageRead } from "@/lib/messages";
import { INQUIRY_TYPE_LABELS } from "@/lib/inquiry-types";
import { MESSAGE_STATUS_LABELS } from "@/lib/message-status";

export const metadata: Metadata = {
  title: "Message · Admin",
  robots: { index: false, follow: false },
};

export const instant = false;

const field =
  "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted";

const dateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);

export default async function AdminMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  let message = await withDbRetry(() => getMessageById(db, id));
  if (!message) notFound();

  // First open of a NEW message stamps readAt and moves it to READ.
  // Already-handled messages keep their status and original readAt.
  if (message.status === "NEW") {
    await withDbRetry(() => markMessageRead(db, id));
    message = await withDbRetry(() => getMessageById(db, id));
    if (!message) notFound();
  }

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/admin/messages"
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All messages
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              {INQUIRY_TYPE_LABELS[message.type] ?? message.type} ·{" "}
              {MESSAGE_STATUS_LABELS[message.status]}
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase leading-none sm:text-5xl">
              {message.subject || message.name}
            </h1>
          </div>
          <p className="font-mono text-xs text-muted">
            Received {dateTime(message.createdAt)} UTC
            {message.readAt && ` · Read ${dateTime(message.readAt)} UTC`}
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="border border-white/10 bg-panel p-6">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className={field}>From</dt>
                  <dd className="mt-1.5 text-sm text-white">{message.name}</dd>
                </div>
                <div>
                  <dt className={field}>Email</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    <a
                      href={`mailto:${message.email}`}
                      className="text-volt hover:underline"
                    >
                      {message.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className={field}>Category</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {INQUIRY_TYPE_LABELS[message.type] ?? message.type}
                  </dd>
                </div>
                <div>
                  <dt className={field}>Subject</dt>
                  <dd className="mt-1.5 text-sm text-white">
                    {message.subject || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={field}>Message</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {message.message}
                  </dd>
                </div>
              </dl>
            </div>

            {(message.reviewedAt || message.reviewNotes) && (
              <div className="border border-white/10 bg-panel p-6">
                <p className={field}>Internal review</p>
                {message.reviewedAt && (
                  <p className="mt-2 text-sm text-muted">
                    Last reviewed by{" "}
                    {message.reviewer?.name ?? "an admin"} on{" "}
                    {dateTime(message.reviewedAt)} UTC.
                  </p>
                )}
                {message.reviewNotes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {message.reviewNotes}
                  </p>
                )}
              </div>
            )}
          </div>

          <MessageReviewPanel
            id={message.id}
            status={message.status}
            initialNotes={message.reviewNotes ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
