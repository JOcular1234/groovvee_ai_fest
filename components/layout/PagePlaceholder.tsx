import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

type PagePlaceholderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function PagePlaceholder({
  title,
  description,
  eyebrow = "Coming soon",
  cta,
  secondaryCta,
}: PagePlaceholderProps) {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-5 pt-24">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-display text-6xl uppercase leading-none sm:text-7xl">
          {title}
          <span className="text-volt">.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-muted">{description}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/" variant="outline">
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </ButtonLink>
          {cta && <ButtonLink href={cta.href}>{cta.label}</ButtonLink>}
          {secondaryCta && (
            <ButtonLink href={secondaryCta.href} variant="outline">
              {secondaryCta.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
