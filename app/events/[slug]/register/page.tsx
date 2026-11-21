import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegisterForm } from "@/components/events/RegisterForm";
import { CollageBackground } from "@/components/ui/CollageBackground";
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
      <CollageBackground />
      <div className="relative mx-auto max-w-3xl">
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {event.title}
        </Link>

        <p className="mt-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          <span className="inline-block size-2 bg-volt" aria-hidden />
          {formatEventDateTime(event.startsAt, event.timezone)} ·{" "}
          {timeZoneLabel(event.startsAt, event.timezone)}
        </p>
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-6xl">
          <span className="bg-volt px-2 text-ink">Register.</span>
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
          <div className="mt-10 border border-ink/15 bg-white/95 p-8 backdrop-blur-sm sm:p-10">
            <p className="text-ink/70">
              Registration isn&apos;t available for this event.{" "}
              {event.url ? (
                <>
                  Visit{" "}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink underline decoration-volt decoration-2 underline-offset-4 transition-colors hover:bg-volt"
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
              className="mt-8 inline-flex items-center border border-ink/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-volt"
            >
              Browse events
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
