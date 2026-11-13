"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import type { ChatMsg } from "@/components/chat/types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);

  const idRef = useRef(0);
  const tokenRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = () => ++idRef.current;

  const getToken = useCallback(async (force = false): Promise<string> => {
    if (!force && tokenRef.current) return tokenRef.current;
    const res = await fetch("/api/chat/session");
    if (!res.ok) throw new Error("session");
    const { token } = (await res.json()) as { token: string };
    tokenRef.current = token;
    return token;
  }, []);

  // Prefetch a session token the first time the widget opens.
  useEffect(() => {
    if (open) getToken().catch(() => {});
  }, [open, getToken]);

  // Escape closes the panel and returns focus to the launcher.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The panel is full-screen below `sm` — lock page scroll there only.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function postChat(history: ChatMsg[]) {
    const token = await getToken();
    const send = (t: string) =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current?.signal,
        body: JSON.stringify({
          token: t,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          messages: history
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
    const res = await send(token);
    // A stale/expired token gets one transparent refresh + retry.
    return res.status === 403 ? send(await getToken(true)) : res;
  }

  async function runExchange(history: ChatMsg[]) {
    setSending(true);
    abortRef.current = new AbortController();
    const aId = nextId();
    setMessages([...history, { id: aId, role: "assistant", content: "" }]);
    try {
      const res = await postChat(history);
      if (!res.ok || !res.body) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(error ?? "request failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snap = acc;
        setMessages((ms) =>
          ms.map((m) => (m.id === aId ? { ...m, content: snap } : m))
        );
      }
      if (!acc.trim()) throw new Error("empty response");
    } catch (err) {
      const aborted = abortRef.current?.signal.aborted === true;
      const note =
        err instanceof Error && err.message !== "empty response"
          ? err.message
          : "Something went wrong — please try again.";
      setMessages((ms) =>
        ms.map((m) =>
          m.id === aId
            ? m.content
              ? m // keep whatever streamed in
              : { ...m, content: aborted ? "" : note, failed: !aborted }
            : m
        )
      );
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    const history = [
      ...messages.filter((m) => !m.failed),
      { id: nextId(), role: "user" as const, content: t },
    ];
    void runExchange(history);
  }

  // Resend after a failed exchange — the user message is already in the
  // thread, so we just drop the failed bubble and try again.
  function retry() {
    if (sending) return;
    const history = messages.filter((m) => !m.failed);
    if (history[history.length - 1]?.role !== "user") return;
    void runExchange(history);
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            key="launcher"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="group fixed bottom-5 right-5 z-40 flex items-center gap-4"
          >
            <div
              className="pointer-events-none hidden translate-x-2 border border-white/10 bg-panel px-4 py-3 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 sm:block sm:opacity-0"
              aria-hidden
            >
              <p className="text-sm font-semibold text-white">Need help?</p>
              <p className="mt-0.5 text-sm text-muted">
                Chat with the GrooVVee AI Assistant.
              </p>
            </div>
            <button
              ref={launcherRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-label="Open GrooVVee AI Assistant"
              className={`grid size-13 shrink-0 cursor-pointer place-items-center bg-volt text-ink shadow-lg transition-colors hover:bg-white ${focusRing}`}
            >
              <Bot className="size-6" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="GrooVVee AI Assistant"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-60 flex flex-col border-white/10 bg-ink sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(620px,calc(100svh-9rem))] sm:w-100 sm:border sm:bg-panel"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-volt">
                <span
                  className="inline-block size-2 animate-pulse bg-volt"
                  aria-hidden
                />
                GrooVVee AI Assistant
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className={`grid size-9 cursor-pointer place-items-center text-muted transition-colors hover:text-white ${focusRing}`}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <ChatMessages
              messages={messages}
              sending={sending}
              onSuggestion={send}
              onRetry={retry}
            />
            <ChatInput ref={inputRef} sending={sending} onSend={send} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
