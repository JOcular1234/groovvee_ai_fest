import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ConfirmRegistrationForm } from "@/components/events/ConfirmRegistrationForm";
import { CollageBackground } from "@/components/ui/CollageBackground";
import { db, withDbRetry } from "@/lib/db";
import { formatEventDateTime, timeZoneLabel } from "@/lib/datetime";
import { findPendingRegistrationByToken } from "@/lib/registrations";

export const metadata: Metadata = {
  title: "Confirm registration",
  robots: { index: false, follow: false },
};

// Token lookup is per request; nothing here may be prerendered.
export const instant = false;

export default async function ConfirmRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await connection();
  const { token = "" } = await searchParams;
  const pending = await withDbRetry(() =>
    findPendingRegistrationByToken(db, token)
  ).catch(() => null);

  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-24 sm:px-8 sm:pb-32">
      <CollageBackground />
      <div className="relative mx-auto max-w-3xl">
        {pending && (
          <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
            <span className="inline-block size-2 bg-volt" aria-hidden />
            {formatEventDateTime(pending.event.startsAt, pending.event.timezone)} ·{" "}
            {timeZoneLabel(pending.event.startsAt, pending.event.timezone)}
          </p>
        )}
        <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-ink sm:text-6xl">
          <span className="bg-volt px-2 text-ink">Confirm.</span>
        </h1>

        <div className="mt-10">
          {pending ? (
            <ConfirmRegistrationForm
              token={token}
              eventSlug={pending.event.slug}
              eventTitle={pending.event.title}
            />
          ) : (
            <div className="border border-ink/15 bg-white/95 p-8 backdrop-blur-sm sm:p-10">
              <p className="text-ink/70">
                This confirmation link is invalid or was already used. If you
                registered more than once, use the link in the newest email.
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
      </div>
    </section>
  );
}
