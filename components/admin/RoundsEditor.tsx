"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  deleteRoundAction,
  moveRoundAction,
  saveRoundAction,
  type CompetitionFormState,
} from "@/app/admin/(protected)/competitions/actions";

export type RoundValues = {
  id: string;
  name: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  sortOrder: number;
};

const initialState: CompetitionFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-3 py-2 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted";
const btn =
  "inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

function RoundForm({
  competitionId,
  round,
}: {
  competitionId: string;
  round?: RoundValues;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: CompetitionFormState, formData: FormData) => {
      const result = await saveRoundAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    initialState
  );

  return (
    <form
      action={formAction}
      className="border border-white/10 bg-ink p-4"
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      {round && <input type="hidden" name="roundId" value={round.id} />}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className={labelClass} htmlFor={`name-${round?.id ?? "new"}`}>
            Round name *
          </label>
          <input
            id={`name-${round?.id ?? "new"}`}
            name="name"
            defaultValue={round?.name}
            required
            maxLength={160}
            className={inputClass}
            placeholder="Round 1 — Qualifier"
          />
          <FieldError errors={state.errors?.name} />
        </div>
        <div className="sm:w-28">
          <label
            className={labelClass}
            htmlFor={`sortOrder-${round?.id ?? "new"}`}
          >
            Order
          </label>
          <input
            id={`sortOrder-${round?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={round?.sortOrder ?? 0}
            className={inputClass}
          />
          <FieldError errors={state.errors?.sortOrder} />
        </div>
      </div>

      <div className="mt-4">
        <label
          className={labelClass}
          htmlFor={`description-${round?.id ?? "new"}`}
        >
          Description
        </label>
        <textarea
          id={`description-${round?.id ?? "new"}`}
          name="description"
          defaultValue={round?.description}
          maxLength={2000}
          rows={2}
          className={inputClass}
          placeholder="What happens in this round."
        />
        <FieldError errors={state.errors?.description} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className={labelClass}
            htmlFor={`startsAt-${round?.id ?? "new"}`}
          >
            Starts <span className="normal-case">(competition timezone)</span>
          </label>
          <input
            id={`startsAt-${round?.id ?? "new"}`}
            name="startsAt"
            type="datetime-local"
            defaultValue={round?.startsAtLocal}
            className={inputClass}
          />
          <FieldError errors={state.errors?.startsAtLocal} />
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`endsAt-${round?.id ?? "new"}`}
          >
            Ends
          </label>
          <input
            id={`endsAt-${round?.id ?? "new"}`}
            name="endsAt"
            type="datetime-local"
            defaultValue={round?.endsAtLocal}
            className={inputClass}
          />
          <FieldError errors={state.errors?.endsAtLocal} />
        </div>
      </div>

      {state.message && (
        <p className="mt-3 border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
          {state.message}
        </p>
      )}

      <div className="mt-4">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Saving…" : round ? "Save round" : "Add round"}
        </button>
      </div>
    </form>
  );
}

export function RoundsEditor({
  competitionId,
  timezone,
  rounds,
}: {
  competitionId: string;
  timezone: string;
  rounds: RoundValues[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-8 border border-white/10 bg-panel p-6 sm:p-8">
      <h2 className="font-display text-xl uppercase tracking-tight text-white">
        Rounds
      </h2>
      <p className="mt-1 text-sm text-muted">
        Rounds are shown on the public competition page. Times are entered in
        the competition timezone ({timezone}).
      </p>

      <div className="mt-6 space-y-4">
        {rounds.map((r, i) => (
          <div key={r.id} className="flex items-start gap-3">
            <div className="grow">
              <RoundForm competitionId={competitionId} round={r} />
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 pt-6">
              <button
                type="button"
                className={btn}
                disabled={pending || i === 0}
                title="Move up"
                onClick={() => run(() => moveRoundAction(competitionId, r.id, -1))}
              >
                <ArrowUp className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={btn}
                disabled={pending || i === rounds.length - 1}
                title="Move down"
                onClick={() => run(() => moveRoundAction(competitionId, r.id, 1))}
              >
                <ArrowDown className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={`${btn} hover:border-red-400 hover:text-red-400`}
                disabled={pending}
                title="Delete round"
                onClick={() => {
                  if (window.confirm(`Delete round "${r.name}"?`)) {
                    run(() => deleteRoundAction(r.id));
                  }
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        ))}
        {rounds.length === 0 && (
          <p className="text-sm text-muted">No rounds yet.</p>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <h3 className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
        Add a round
      </h3>
      <div className="mt-3">
        <RoundForm competitionId={competitionId} />
      </div>
    </section>
  );
}
