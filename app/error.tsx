"use client";

import { useEffect } from "react";
import { ArrowLeft, RotateCw } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error
      ? (error as Error & { digest?: string }).digest
      : undefined;

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-5 pt-24">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          Error 500
        </p>
        <h1 className="mt-4 font-display text-7xl uppercase leading-none sm:text-8xl">
          Something <span className="text-volt">broke.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-muted">
          An unexpected error stopped this page from loading. Try again — if it
          keeps happening, let us know.
        </p>
        {digest && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Reference: {digest}
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center justify-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:bg-white"
          >
            <RotateCw className="size-4" aria-hidden />
            Try again
          </button>
          <ButtonLink href="/" variant="outline">
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
