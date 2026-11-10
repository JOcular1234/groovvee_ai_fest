"use client";

import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteEventAction,
  moveEventAction,
  setEventFeaturedAction,
  setEventPublishedAction,
} from "@/app/admin/(protected)/events/actions";

type Props = {
  id: string;
  title: string;
  published: boolean;
  featured: boolean;
  isFirst: boolean;
  isLast: boolean;
};

const btn =
  "inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40";

export function EventRowActions({
  id,
  title,
  published,
  featured,
  isFirst,
  isLast,
}: Props) {
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
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          className={btn}
          disabled={pending || isFirst}
          title="Move up"
          onClick={() => run(() => moveEventAction(id, -1))}
        >
          <ArrowUp className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending || isLast}
          title="Move down"
          onClick={() => run(() => moveEventAction(id, 1))}
        >
          <ArrowDown className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending}
          onClick={() => run(() => setEventPublishedAction(id, !published))}
        >
          {published ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={pending}
          title={featured ? "Remove from homepage" : "Show on homepage"}
          onClick={() => run(() => setEventFeaturedAction(id, !featured))}
        >
          <Star
            className={`size-3.5 ${featured ? "fill-volt text-volt" : ""}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className={`${btn} hover:border-red-400 hover:text-red-400`}
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                `Delete event "${title}"? Linked agenda items and competitions will be kept but lose this event.`
              )
            ) {
              run(() => deleteEventAction(id));
            }
          }}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
