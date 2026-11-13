"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

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

type Result = { ok: boolean; message?: string };
type MenuPos = { left: number; top?: number; bottom?: number };

const MENU_W = 224;
const MENU_H_EST = 250;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const btn = `inline-flex min-h-9 items-center justify-center gap-1.5 border border-white/15 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt disabled:pointer-events-none disabled:opacity-40 ${focusRing}`;

const itemBase =
  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none transition-colors focus-visible:bg-white/10 disabled:pointer-events-none disabled:opacity-40";

function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

function Dots() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}

export function EventRowActions({
  id,
  title,
  published,
  featured,
  isFirst,
  isLast,
}: Props) {
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [confirming, setConfirming] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function run(action: () => Promise<Result>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Something went wrong");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  // ---- overflow menu (portalled + fixed so table scroll containers can't clip it)
  function toggleMenu() {
    if (pos) {
      setPos(null);
      return;
    }
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    const flip = window.innerHeight - r.bottom < MENU_H_EST && r.top > MENU_H_EST;
    setPos(
      flip
        ? { left, bottom: window.innerHeight - r.top + 4 }
        : { left, top: r.bottom + 4 }
    );
  }

  function choose(fn: () => void) {
    setPos(null);
    fn();
  }

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPos(null);
        triggerRef.current?.focus();
      }
    };
    const away = () => setPos(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [pos]);

  // Move focus into the menu when it opens (preventScroll: a scroll would close it)
  useEffect(() => {
    if (pos) {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
        ?.focus({ preventScroll: true });
    }
  }, [pos]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled)'
      ) ?? []
    );
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length].focus({ preventScroll: true });
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") {
      e.preventDefault();
      setPos(null);
      triggerRef.current?.focus();
    }
  }

  // ---- delete confirmation dialog
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (confirming && !d.open) d.showModal();
    if (!confirming && d.open) d.close();
  }, [confirming]);

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {!published && (
            <button
              type="button"
              className={`${btn} border-volt/60 text-volt hover:bg-volt hover:text-ink`}
              disabled={pending}
              onClick={() => run(() => setEventPublishedAction(id, true))}
            >
              Publish
            </button>
          )}
          <button
            ref={triggerRef}
            type="button"
            className={`${btn} min-w-9 px-0 ${pos ? "border-volt text-volt" : ""}`}
            disabled={pending}
            aria-label={`More actions for ${title}`}
            aria-haspopup="menu"
            aria-expanded={!!pos}
            aria-controls={pos ? `${uid}-menu` : undefined}
            onClick={toggleMenu}
          >
            {pending ? <Spinner /> : <Dots />}
          </button>
        </div>
        {error && !confirming && (
          <p role="alert" className="max-w-48 text-right text-[11px] text-red-400">
            {error}
          </p>
        )}
      </div>

      {pos &&
        createPortal(
          <div
            ref={menuRef}
            id={`${uid}-menu`}
            role="menu"
            aria-label={`Actions for ${title}`}
            onKeyDown={onMenuKeyDown}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: MENU_W }}
            className="fixed z-100 border border-white/15 bg-ink py-1 shadow-2xl shadow-black/60"
          >
            {published && (
              <button
                type="button"
                role="menuitem"
                className={`${itemBase} text-white/90 hover:bg-white/5`}
                onClick={() =>
                  choose(() => run(() => setEventPublishedAction(id, false)))
                }
              >
                <EyeOff className="size-4 text-muted" aria-hidden />
                Unpublish
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={`${itemBase} text-white/90 hover:bg-white/5`}
              onClick={() =>
                choose(() => run(() => setEventFeaturedAction(id, !featured)))
              }
            >
              <Star
                className={`size-4 ${featured ? "fill-volt text-volt" : "text-muted"}`}
                aria-hidden
              />
              {featured ? "Remove from homepage" : "Show on homepage"}
            </button>

            <div role="separator" className="my-1 border-t border-white/10" />

            <button
              type="button"
              role="menuitem"
              className={`${itemBase} text-white/90 hover:bg-white/5`}
              disabled={isFirst}
              onClick={() => choose(() => run(() => moveEventAction(id, -1)))}
            >
              <ArrowUp className="size-4 text-muted" aria-hidden />
              Move up
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${itemBase} text-white/90 hover:bg-white/5`}
              disabled={isLast}
              onClick={() => choose(() => run(() => moveEventAction(id, 1)))}
            >
              <ArrowDown className="size-4 text-muted" aria-hidden />
              Move down
            </button>

            <div role="separator" className="my-1 border-t border-white/10" />

            <button
              type="button"
              role="menuitem"
              className={`${itemBase} text-red-400 hover:bg-red-500/10`}
              onClick={() =>
                choose(() => {
                  setError(null);
                  setConfirming(true);
                })
              }
            >
              <Trash2 className="size-4" aria-hidden />
              Delete event…
            </button>
          </div>,
          document.body
        )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-dialog-title`}
        onClose={() => setConfirming(false)}
        onClick={(e) => {
          // click on the backdrop (the dialog element itself) dismisses
          if (e.target === e.currentTarget && !pending) setConfirming(false);
        }}
        className="m-auto w-[min(28rem,calc(100%-2rem))] border border-white/15 bg-panel p-0 text-white backdrop:bg-black/70"
      >
        <div className="p-6">
          <h2
            id={`${uid}-dialog-title`}
            className="font-display text-2xl uppercase leading-tight"
          >
            Delete this event?
          </h2>
          <p className="mt-4 text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm text-muted">
            Linked agenda items and competitions will be kept but lose this
            event. This can&apos;t be undone.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className={btn}
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteEventAction(id),
                  () => setConfirming(false)
                )
              }
              className={`inline-flex min-h-9 items-center justify-center gap-2 bg-red-500 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-400 disabled:opacity-60 ${focusRing}`}
            >
              {pending && <Spinner />}
              Delete event
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}