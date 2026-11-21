"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  confirmRegistrationAction,
  type ConfirmState,
} from "@/app/events/[slug]/register/actions";

const initialState: ConfirmState = { ok: false };

export function ConfirmRegistrationForm({
  token,
  eventSlug,
  eventTitle,
}: {
  token: string;
  eventSlug: string;
  eventTitle: string;
}) {
  const action = confirmRegistrationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.done) {
    return (
      <div className="border border-ink bg-volt p-10 text-center text-ink shadow-[8px_8px_0_0_currentColor]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em]">
          You&apos;re registered
        </p>
        <p className="mx-auto mt-4 max-w-md font-medium text-ink/75">
          Your spot at {eventTitle} is confirmed. See you there.
        </p>
        <Link
          href={`/events/${eventSlug}`}
          className="mt-8 inline-flex items-center border border-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-volt"
        >
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-ink/15 bg-white/95 p-8 backdrop-blur-sm sm:p-10">
      <p className="text-ink/70">
        Confirm your registration for <span className="font-medium text-ink">{eventTitle}</span>.
      </p>
      {state.message && (
        <p role="alert" className="mt-6 border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-8 inline-flex cursor-pointer items-center gap-2 border border-ink bg-ink px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-volt transition-colors hover:bg-panel disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm my spot"}
      </button>
    </form>
  );
}
