import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegisterForm } from "@/components/events/RegisterForm";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import { issueFormToken } from "@/lib/form-token";
import { getEventBySlug } from "@/lib/public/events";
import { isRegistrationOpen } from "@/lib/registrations";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

// Issues a fresh signed form token per render.
export const instant = false;

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // issueFormToken uses unstable values (Date.now) — keep them request-time.
  await connection();
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const open = isRegistrationOpen(event);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted transition-colors hover:text-volt"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {event.title}
        </Link>

        <p className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          {formatEventDateTime(event.startsAt, event.timezone)} ·{" "}
          {timeZoneLabel(event.startsAt, event.timezone)}
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">
          Register<span className="text-volt">.</span>
        </h1>

        {open ? (
          <div className="mt-10">
            <RegisterForm
              eventSlug={event.slug}
              eventTitle={event.title}
              token={issueFormToken()}
            />
          </div>
        ) : (
          <div className="mt-10 border border-white/10 bg-panel p-8 sm:p-10">
            <p className="text-muted">
              Registration isn&apos;t available for this event.{" "}
              {event.url ? (
                <>
                  Visit{" "}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-volt underline underline-offset-4 transition-colors hover:text-white"
                  >
                    the organiser&apos;s page
                  </a>{" "}
                  for attendance details.
                </>
              ) : (
                "Check back later or browse other events."
              )}
            </p>
            <Link
              href="/events"
              className="mt-8 inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
            >
              Browse events
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
