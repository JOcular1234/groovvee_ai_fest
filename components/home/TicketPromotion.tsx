import { ArrowRight, Check } from "lucide-react";
import { ticketTiers } from "@/data/event";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function TicketPromotion() {
  return (
    <section className="bg-volt py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          dark
          eyebrow="Tickets"
          title={
            <>
              Your next big idea
              <br />
              starts here.
            </>
          }
        />

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg font-semibold">
            Don&apos;t just hear about the future. Experience it.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {ticketTiers.map((tier, i) => (
            <Reveal key={tier.name} delay={0.1 * i} className="h-full">
              <div className="flex h-full flex-col border-2 border-ink p-8 sm:p-10">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink/60">
                    {tier.tag}
                  </span>
                  <span className="border border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
                    {tier.price}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-3xl uppercase sm:text-4xl">
                  {tier.name}
                </h3>
                <p className="mt-3 text-ink/70">{tier.description}</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/tickets"
                  variant="dark"
                  className="mt-10 w-full"
                >
                  {tier.cta}
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-ink/60">
            Pricing, dates and release details will be announced soon.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
