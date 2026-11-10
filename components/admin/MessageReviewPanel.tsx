"use client";

import { useState, useTransition } from "react";

import {
  setMessageStatusAction,
  updateMessageNotesAction,
} from "@/app/admin/(protected)/messages/actions";
import { MESSAGE_STATUSES } from "@/lib/message-status";

const btn =
  "w-full border px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function MessageReviewPanel({
  id,
  status,
  initialNotes,
}: {
  id: string;
  status: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? "Saved." : res.message ?? "Something went wrong.");
    });

  return (
    <aside className="space-y-6">
      <div className="border border-white/10 bg-panel p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Status
        </p>
        <div className="mt-4 space-y-2">
          {MESSAGE_STATUSES.filter((s) => s.value !== status).map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={pending}
              onClick={() =>
                act(() => setMessageStatusAction(id, s.value))
              }
              className={`${btn} border-white/25 text-white hover:border-volt hover:text-volt`}
            >
              Mark as {s.label.toLowerCase()}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          Current status:{" "}
          <span className="font-mono uppercase tracking-[0.15em] text-volt">
            {MESSAGE_STATUSES.find((s) => s.value === status)?.label}
          </span>
        </p>
      </div>

      <div className="border border-white/10 bg-panel p-6">
        <label
          htmlFor="reviewNotes"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
        >
          Internal notes (private)
        </label>
        <textarea
          id="reviewNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={2000}
          className="mt-3 w-full border border-white/15 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-volt"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => updateMessageNotesAction(id, notes))}
          className={`${btn} mt-3 border-white/25 text-white hover:border-volt hover:text-volt`}
        >
          Save notes
        </button>
      </div>

      {message && (
        <p className="border border-white/10 bg-panel px-4 py-3 text-sm text-muted">
          {message}
        </p>
      )}
    </aside>
  );
}
