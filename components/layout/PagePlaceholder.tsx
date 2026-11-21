import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CollageBackground } from "@/components/ui/CollageBackground";

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
      <CollageBackground />
      <div className="relative text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-ink/60">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-display text-6xl uppercase leading-none text-ink sm:text-7xl">
          <span className="bg-volt px-2 text-ink">{title}.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md font-medium text-ink/70">{description}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/" variant="outlineDark">
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </ButtonLink>
          {cta && (
            <ButtonLink href={cta.href} variant="dark">
              {cta.label}
            </ButtonLink>
          )}
          {secondaryCta && (
            <ButtonLink href={secondaryCta.href} variant="outlineDark">
              {secondaryCta.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
