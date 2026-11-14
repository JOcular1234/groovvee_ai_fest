"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "gv_cookies_notice_v1";

// An informational strip, not a consent gate — the site only sets strictly
// necessary cookies (admin session, form security tokens), so nothing here
// toggles tracking. Dismissal is remembered in localStorage, not a cookie.
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-40 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start gap-4 border border-white/15 bg-panel/95 p-4 shadow-2xl backdrop-blur">
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt">
            Cookies
          </span>
          <br />
          This site only uses essential cookies to keep forms secure — no
          tracking, no ads.{" "}
          <Link
            href="/privacy#cookies"
            className="text-volt hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
          >
            Details
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss cookie notice"
          className="shrink-0 border border-white/15 p-1.5 text-muted transition-colors hover:border-volt hover:text-volt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
