"use client";

import { useState, useTransition } from "react";

import {
  setHackWarsStatusAction,
  updateHackWarsNotesAction,
} from "@/app/admin/(protected)/hack-wars/actions";
import { APPLICATION_STATUS_LABELS } from "@/lib/application-status";

const btn =
  "w-full border px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const allowedTargets = (status: string): string[] =>
  status === "PENDING"
    ? ["REVIEWED", "ACCEPTED", "REJECTED"]
    : status === "REVIEWED"
      ? ["ACCEPTED", "REJECTED"]
      : [];

export function HackWarsReviewPanel({
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
  const targets = allowedTargets(status);

  const act = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? "Saved." : res.message ?? "Something went wrong.");
    });

  return (
    <aside className="space-y-6">
      <div className="border border-white/10 bg-panel p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Decision
        </p>
        <div className="mt-4 space-y-2">
          {targets.includes("REVIEWED") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => setHackWarsStatusAction(id, "REVIEWED"))}
              className={`${btn} border-white/25 text-white hover:border-volt hover:text-volt`}
            >
              Mark as reviewed
            </button>
          )}
          {targets.includes("ACCEPTED") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => setHackWarsStatusAction(id, "ACCEPTED"))}
              className={`${btn} border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10`}
            >
              Accept entry
            </button>
          )}
          {targets.includes("REJECTED") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Reject this entry? This cannot be undone.")) {
                  act(() => setHackWarsStatusAction(id, "REJECTED"));
                }
              }}
              className={`${btn} border-red-400/40 text-red-300 hover:bg-red-400/10`}
            >
              Reject entry
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-muted">
          Current status:{" "}
          <span className="font-mono uppercase tracking-[0.15em] text-volt">
            {APPLICATION_STATUS_LABELS[status] ??
              status}
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
          onClick={() => act(() => updateHackWarsNotesAction(id, notes))}
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
