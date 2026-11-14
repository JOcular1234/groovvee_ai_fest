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
      <div className="border border-volt/40 bg-panel p-10 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-volt">
          You&apos;re registered
        </p>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Your spot at {eventTitle} is confirmed. See you there.
        </p>
        <Link
          href={`/events/${eventSlug}`}
          className="mt-8 inline-flex items-center border border-white/25 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-volt hover:text-volt"
        >
          Back to event
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-white/10 bg-panel p-8 sm:p-10">
      <p className="text-muted">
        Confirm your registration for <span className="text-white">{eventTitle}</span>.
      </p>
      {state.message && (
        <p role="alert" className="mt-6 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-8 inline-flex cursor-pointer items-center gap-2 bg-volt px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm my spot"}
      </button>
    </form>
  );
}
