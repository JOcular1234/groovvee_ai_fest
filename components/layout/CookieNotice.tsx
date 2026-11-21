"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "gv_cookies_notice_v1";

// No subscription needed: dismissal is only written by this component and
// tracked in local state below; the store just reads localStorage on mount.
const subscribe = () => () => {};
const getDismissed = () => localStorage.getItem(STORAGE_KEY) !== null;
// Server snapshot "dismissed" keeps SSR and first client paint identical.
const getDismissedServer = () => true;

// An informational strip, not a consent gate — the site only sets strictly
// necessary cookies (admin session, form security tokens), so nothing here
// toggles tracking. Dismissal is remembered in localStorage, not a cookie.
export function CookieNotice() {
  const storedDismissed = useSyncExternalStore(
    subscribe,
    getDismissed,
    getDismissedServer
  );
  const [justDismissed, setJustDismissed] = useState(false);

  if (storedDismissed || justDismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setJustDismissed(true);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-40 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start gap-4 border border-ink bg-white/95 p-4 shadow-2xl backdrop-blur">
        <p className="text-xs leading-relaxed text-ink/70">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
            Cookies
          </span>
          <br />
          This site only uses essential cookies to keep forms secure — no
          tracking, no ads.{" "}
          <Link
            href="/privacy#cookies"
            className="font-medium text-ink underline decoration-volt decoration-2 underline-offset-2 hover:bg-volt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
          >
            Details
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss cookie notice"
          className="shrink-0 border border-ink/20 p-1.5 text-ink/60 transition-colors hover:border-ink hover:bg-volt hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
