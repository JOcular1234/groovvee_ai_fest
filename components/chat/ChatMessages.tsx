"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import {
  SUGGESTIONS,
  WELCOME_MESSAGE,
  type ChatMsg,
} from "@/components/chat/types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const linkCls =
  "text-volt underline underline-offset-2 transition-colors hover:text-white";

// Minimal markdown-lite: the assistant is prompted to answer in plain text
// with [label](/path) links — render those and preserve paragraphs.
function renderRich(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [raw, label, href] = m;
    parts.push(
      href.startsWith("/") ? (
        <Link key={k++} href={href} className={linkCls}>
          {label}
        </Link>
      ) : (
        <a
          key={k++}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={linkCls}
        >
          {label}
        </a>
      )
    );
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 px-1 py-2"
      role="status"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse bg-volt"
          style={{ animationDelay: `${i * 150}ms` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

type Props = {
  messages: ChatMsg[];
  sending: boolean;
  onSuggestion: (q: string) => void;
  onRetry: () => void;
};

export function ChatMessages({
  messages,
  sending,
  onSuggestion,
  onRetry,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const last = messages[messages.length - 1];
  const typing = sending && last?.role === "assistant" && !last.content;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overscroll-contain px-5 py-5"
      aria-live="polite"
      aria-label="Conversation"
    >
      {messages.length === 0 ? (
        <div>
          <p className="border border-white/10 bg-panel px-4 py-3 text-sm leading-relaxed text-white/90 sm:bg-ink">
            {WELCOME_MESSAGE}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSuggestion(q)}
                className={`cursor-pointer border border-white/15 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-volt hover:text-volt ${focusRing}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex"}
            >
              {m.role === "user" ? (
                <p className="max-w-[85%] bg-volt px-4 py-3 text-sm font-medium text-ink">
                  {m.content}
                </p>
              ) : (
                <div className="min-w-0 flex-1">
                  {m.failed ? (
                    <div className="border border-white/10 px-4 py-3">
                      <p className="text-sm text-muted">{m.content}</p>
                      <button
                        type="button"
                        onClick={onRetry}
                        className={`mt-3 inline-flex cursor-pointer items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:text-white ${focusRing}`}
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                        Try again
                      </button>
                    </div>
                  ) : m.content ? (
                    <div className="space-y-3 whitespace-pre-wrap px-1 text-sm leading-relaxed text-white/90">
                      {m.content.split(/\n{2,}/).map((para, i) => (
                        <p key={i}>{renderRich(para)}</p>
                      ))}
                    </div>
                  ) : (
                    <TypingIndicator />
                  )}
                </div>
              )}
            </li>
          ))}
          {typing && (
            <li>
              <TypingIndicator />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
