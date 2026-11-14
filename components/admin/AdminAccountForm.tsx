"use client";

import { Check, Copy, Eye, EyeOff, KeyRound, Shield, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createAdminAction,
  updateAdminAction,
  type AdminFormState,
} from "@/app/admin/(protected)/admins/actions";
import { ADMIN_SECTIONS } from "@/lib/auth/permissions";

const initialState: AdminFormState = { ok: false };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3.5 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt aria-invalid:border-red-400";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

type Level = "none" | "view" | "manage";

const LEVELS: { value: Level; label: string; on: string }[] = [
  { value: "none", label: "None", on: "peer-checked:bg-white/15 peer-checked:text-white" },
  { value: "view", label: "View", on: "peer-checked:bg-volt/25 peer-checked:text-volt" },
  { value: "manage", label: "Manage", on: "peer-checked:bg-volt peer-checked:text-ink" },
];

function levelFor(permissions: string[], key: string): Level {
  return permissions.includes(`${key}:manage`)
    ? "manage"
    : permissions.includes(`${key}:view`)
      ? "view"
      : "none";
}

function generatePassword(len = 16) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  const chars = Array.from(bytes, (b) => all[b % all.length]);
  // guarantee the "a letter and a digit" rule, at pseudo-random positions
  const i = bytes[0] % len;
  const j = (i + 1 + (bytes[1] % (len - 1))) % len;
  chars[i] = letters[bytes[2] % letters.length];
  chars[j] = digits[bytes[3] % digits.length];
  return chars.join("");
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-400">
      {errors[0]}
    </p>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-white/10 bg-panel">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-white/10 px-6 py-5 sm:px-8">
        <span className="font-mono text-xs font-bold text-volt">{step}</span>
        <h2 className="font-display text-2xl uppercase leading-none sm:text-3xl">
          {title}
        </h2>
        {hint && <p className="w-full text-sm text-muted sm:ml-auto sm:w-auto">{hint}</p>}
      </header>
      <div className="p-6 sm:p-8">{children}</div>
    </section>
  );
}

// Controlled radios — React resets uncontrolled form fields after a
// server-action submission, which would wipe every value on a validation
// error. State lives in the parent so an error round-trip loses nothing.
// Each section posts as `perm_<key>` = none | view | manage, same as before.
export function AccessEditor({
  levels,
  onChange,
  onSetAll,
}: {
  levels: Record<string, string>;
  onChange: (section: string, level: string) => void;
  onSetAll?: (level: Level) => void;
}) {
  const counts = { manage: 0, view: 0, none: 0 };
  for (const s of ADMIN_SECTIONS) {
    const l = (levels[s.key] ?? "none") as Level;
    counts[l in counts ? l : "none"]++;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          <span className="font-semibold text-volt">{counts.manage}</span> manage
          {" · "}
          <span className="font-semibold text-white">{counts.view}</span> view
          {" · "}
          <span className="font-semibold text-white">{counts.none}</span> no access
        </p>
        {onSetAll && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Set all to</span>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => onSetAll(l.value)}
                className={`min-h-9 border border-white/15 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:border-volt hover:text-volt ${focusRing}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
        {ADMIN_SECTIONS.map((s) => {
          const current = levels[s.key] ?? "none";
          return (
            <div
              key={s.key}
              className="flex flex-col gap-3 bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-semibold text-white">{s.label}</span>
              <div
                role="radiogroup"
                aria-label={`${s.label} access`}
                className="grid grid-cols-3 border border-white/15 sm:w-56"
              >
                {LEVELS.map((l) => (
                  <label key={l.value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name={`perm_${s.key}`}
                      value={l.value}
                      checked={current === l.value}
                      onChange={() => onChange(s.key, l.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-10 items-center justify-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted transition-colors hover:text-white peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-volt ${l.on}`}
                    >
                      {l.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ROLES = [
  {
    value: "ADMIN" as const,
    title: "Admin",
    desc: "Limited to the sections you choose below.",
    Icon: Shield,
  },
  {
    value: "SUPER_ADMIN" as const,
    title: "Super admin",
    desc: "Full access to everything, including other admins.",
    Icon: ShieldCheck,
  },
];

export function AdminAccountForm({
  admin,
}: {
  admin?: { id: string; name: string; permissions: string[] };
}) {
  const action = admin ? updateAdminAction : createAdminAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(admin?.name ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [levels, setLevels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ADMIN_SECTIONS.map((s) => [
        s.key,
        levelFor(admin?.permissions ?? [], s.key),
      ])
    )
  );

  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.message) {
      messageRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [state]);

  const pwRules = [
    { ok: password.length >= 12, label: "12+ characters" },
    { ok: /[A-Za-z]/.test(password), label: "A letter" },
    { ok: /\d/.test(password), label: "A digit" },
  ];

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the field is visible, so it can be copied by hand */
    }
  }

  // numbered section headers, in render order
  let n = 0;
  const step = () => String(++n).padStart(2, "0");

  const showAccess = admin || role === "ADMIN";

  return (
    <form action={formAction} className="mt-10 space-y-6">
      {admin && <input type="hidden" name="id" value={admin.id} />}

      {state.message && (
        <div
          ref={messageRef}
          role={state.ok ? "status" : "alert"}
          className={`border px-5 py-4 text-sm ${
            state.ok
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/40 bg-red-400/10 text-red-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <Section
        step={step()}
        title="Account"
        hint={admin ? undefined : "Who is this person?"}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!state.errors?.name?.length}
              aria-describedby={state.errors?.name?.length ? "name-error" : undefined}
              className={inputClass}
            />
            <FieldError id="name-error" errors={state.errors?.name} />
          </div>

          {!admin && (
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!state.errors?.email?.length}
                aria-describedby={state.errors?.email?.length ? "email-error" : undefined}
                className={inputClass}
              />
              <FieldError id="email-error" errors={state.errors?.email} />
            </div>
          )}

          {!admin && (
            <div className="sm:col-span-2">
              <label htmlFor="password" className={labelClass}>
                Temporary password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!state.errors?.password?.length}
                    aria-describedby="password-rules password-error"
                    className={`${inputClass} pr-12 ${showPw ? "font-mono" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                    className={`absolute right-0 top-0 grid size-full max-w-12 place-items-center text-muted transition-colors hover:text-volt ${focusRing}`}
                  >
                    {showPw ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(generatePassword());
                    setShowPw(true);
                  }}
                  className={`inline-flex min-h-12 items-center gap-2 border border-white/25 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-volt hover:text-volt ${focusRing}`}
                >
                  <KeyRound className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Generate</span>
                </button>
                <button
                  type="button"
                  onClick={copyPassword}
                  disabled={!password}
                  aria-label="Copy password"
                  className={`inline-flex min-h-12 items-center gap-2 border border-white/25 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-volt hover:text-volt disabled:pointer-events-none disabled:opacity-40 ${focusRing}`}
                >
                  {copied ? (
                    <Check className="size-4 text-volt" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <ul
                id="password-rules"
                className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs"
              >
                {pwRules.map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center gap-1.5 ${
                      r.ok ? "text-emerald-300" : "text-muted"
                    }`}
                  >
                    {r.ok ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <span className="size-1.5 bg-current opacity-50" aria-hidden />
                    )}
                    {r.label}
                    <span className="sr-only">{r.ok ? "(met)" : "(not met)"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Share it securely. The new admin must set their own password on
                first sign-in.
              </p>
              <FieldError id="password-error" errors={state.errors?.password} />
            </div>
          )}
        </div>
      </Section>

      {!admin && (
        <Section step={step()} title="Role" hint="Decides how much they can see and do.">
          <fieldset>
            <legend className="sr-only">Role</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map(({ value, title, desc, Icon }) => {
                const selected = role === value;
                return (
                  <label
                    key={value}
                    className={`relative flex cursor-pointer gap-4 border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-volt ${
                      selected
                        ? "border-volt bg-volt/10"
                        : "border-white/15 hover:border-white/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={selected}
                      onChange={() => setRole(value)}
                      className="sr-only"
                    />
                    <span
                      className={`grid size-11 shrink-0 place-items-center ${
                        selected ? "bg-volt text-ink" : "border border-white/20 text-white"
                      }`}
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-xl uppercase leading-none">
                        {title}
                      </span>
                      <span className="mt-1.5 block text-sm text-muted">{desc}</span>
                    </span>
                    {selected && (
                      <Check
                        className="absolute right-4 top-4 size-4 text-volt"
                        aria-hidden
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Section>
      )}

      {showAccess ? (
        <Section
          step={step()}
          title="Section access"
          hint="None hides it, View is read-only, Manage can edit."
        >
          <AccessEditor
            levels={levels}
            onChange={(section, level) =>
              setLevels((prev) => ({ ...prev, [section]: level }))
            }
            onSetAll={(level) =>
              setLevels(Object.fromEntries(ADMIN_SECTIONS.map((s) => [s.key, level])))
            }
          />
        </Section>
      ) : (
        <div className="flex gap-4 border border-volt/40 bg-volt/10 p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-volt" aria-hidden />
          <p className="text-sm text-white/90">
            Super admins have full access to every section, can manage other
            admins, and can promote or demote accounts. Only give this role to
            people you fully trust.
          </p>
        </div>
      )}

      {/* Floating action bar — always in reach on long forms */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 border border-white/15 bg-ink/95 p-4 backdrop-blur">
        <Link
          href="/admin/admins"
          className={`inline-flex min-h-11 items-center px-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt ${focusRing}`}
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex min-h-12 items-center justify-center gap-2 bg-volt px-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:opacity-60 ${focusRing}`}
        >
          {pending && (
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
          )}
          {pending ? "Saving…" : admin ? "Save changes" : "Create admin"}
        </button>
      </div>
    </form>
  );
}