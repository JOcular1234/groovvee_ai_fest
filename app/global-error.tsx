"use client";

import { useEffect } from "react";
import "./globals.css";
import { fontVariables } from "./fonts";

// Replaces the root layout on failure — must render its own <html>/<body>
// and import its own styles, since the layout (and its fonts/CSS) is gone.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink font-sans text-white">
        <title>Something went wrong — Groovvee AI Fest</title>
        <main className="relative flex min-h-dvh flex-1 items-center justify-center px-5">
          <div className="text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
              Error 500
            </p>
            <h1 className="mt-4 font-display text-7xl uppercase leading-none sm:text-8xl">
              Something <span className="text-volt">broke.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-muted">
              An unexpected error stopped the site from loading.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              className="mt-10 inline-flex items-center justify-center gap-2 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:bg-white"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
