"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const btn =
  "inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt";

const noopSubscribe = () => () => {};

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // Native share sheet (mobile) is only known after hydration.
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="mr-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
        Share
      </p>
      {canNativeShare && (
        <button
          type="button"
          className={btn}
          onClick={() => navigator.share({ title, url }).catch(() => {})}
        >
          <Share2 className="size-3.5" aria-hidden />
          Share
        </button>
      )}
      <button type="button" className={btn} onClick={copy} aria-live="polite">
        {copied ? (
          <Check className="size-3.5 text-volt" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>
      {targets.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={btn}
          aria-label={`Share on ${s.label}`}
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}
