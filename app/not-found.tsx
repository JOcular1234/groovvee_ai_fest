import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-5 pt-24">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Error 404
        </p>
        <h1 className="mt-4 font-display text-7xl uppercase leading-none sm:text-8xl">
          Lost in the <span className="text-volt">void.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-muted">
          This page doesn&apos;t exist — but the future does. Head back to the
          festival.
        </p>
        <div className="mt-10">
          <ButtonLink href="/" variant="outline">
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
