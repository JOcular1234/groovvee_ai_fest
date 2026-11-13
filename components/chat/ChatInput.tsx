"use client";

import { SendHorizontal } from "lucide-react";
import { forwardRef, useState } from "react";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

export const ChatInput = forwardRef<
  HTMLInputElement,
  { sending: boolean; onSend: (text: string) => void }
>(function ChatInput({ sending, onSend }, ref) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || sending) return;
    onSend(t);
    setValue("");
  }

  return (
    <form
      className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="chat-input" className="sr-only">
        Message GrooVVee AI Assistant
      </label>
      <input
        ref={ref}
        id="chat-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about GrooVVee…"
        maxLength={500}
        disabled={sending}
        autoComplete="off"
        className={`min-w-0 flex-1 border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/60 disabled:opacity-50 ${focusRing}`}
      />
      <button
        type="submit"
        disabled={sending || !value.trim()}
        aria-label="Send message"
        className={`grid size-11 shrink-0 cursor-pointer place-items-center bg-volt text-ink transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-40 ${focusRing}`}
      >
        <SendHorizontal className="size-5" aria-hidden />
      </button>
    </form>
  );
});
