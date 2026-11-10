"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  promoteApplicationAction,
  setApplicationStatusAction,
  updateApplicationNotesAction,
} from "@/app/admin/(protected)/applications/actions";

const btn =
  "w-full border px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function ApplicationReviewPanel({
  id,
  status,
  speakerId,
  initialNotes,
}: {
  id: string;
  status: string;
  speakerId: string | null;
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
          Decision
        </p>
        <div className="mt-4 space-y-2">
          {status === "PENDING" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => setApplicationStatusAction(id, "REVIEWED"))}
              className={`${btn} border-white/25 text-white hover:border-volt hover:text-volt`}
            >
              Mark as reviewed
            </button>
          )}
          {(status === "PENDING" || status === "REVIEWED") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => setApplicationStatusAction(id, "ACCEPTED"))}
              className={`${btn} border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10`}
            >
              Accept application
            </button>
          )}
          {(status === "PENDING" || status === "REVIEWED") && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Reject this application? This cannot be undone.")) {
                  act(() => setApplicationStatusAction(id, "REJECTED"));
                }
              }}
              className={`${btn} border-red-400/40 text-red-300 hover:bg-red-400/10`}
            >
              Reject application
            </button>
          )}
        </div>

        {status === "ACCEPTED" && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {speakerId ? (
              <Link
                href={`/admin/speakers/${speakerId}/edit`}
                className={`${btn} block border-volt bg-volt text-center text-ink hover:opacity-90`}
              >
                Edit linked speaker
              </Link>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await promoteApplicationAction(id);
                  })
                }
                className={`${btn} border-volt bg-volt text-ink hover:opacity-90`}
              >
                Create speaker profile
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border border-white/10 bg-panel p-6">
        <label
          htmlFor="reviewNotes"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted"
        >
          Review notes (private)
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
          onClick={() => act(() => updateApplicationNotesAction(id, notes))}
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
