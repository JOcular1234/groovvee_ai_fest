"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createAdminAction,
  updateAdminAction,
  type AdminFormState,
} from "@/app/admin/(protected)/admins/actions";
import { adminSelectClass } from "@/components/admin/ui";
import { ADMIN_SECTIONS } from "@/lib/auth/permissions";

const initialState: AdminFormState = { ok: false };

const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

function levelFor(permissions: string[], key: string): string {
  return permissions.includes(`${key}:manage`)
    ? "manage"
    : permissions.includes(`${key}:view`)
      ? "view"
      : "none";
}

// Controlled selects — React resets uncontrolled form fields after a
// server-action submission, which would wipe every value on a validation
// error. State lives in the parent so an error round-trip loses nothing.
export function AccessEditor({
  levels,
  onChange,
}: {
  levels: Record<string, string>;
  onChange: (section: string, level: string) => void;
}) {
  return (
    <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
      {ADMIN_SECTIONS.map((s) => (
        <label
          key={s.key}
          className="flex items-center justify-between gap-4 bg-panel px-4 py-3"
        >
          <span className="text-sm font-semibold text-white">{s.label}</span>
          <select
            name={`perm_${s.key}`}
            value={levels[s.key] ?? "none"}
            onChange={(e) => onChange(s.key, e.target.value)}
            className={adminSelectClass}
          >
            <option value="none">No access</option>
            <option value="view">View</option>
            <option value="manage">Manage</option>
          </select>
        </label>
      ))}
    </div>
  );
}

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
  const [levels, setLevels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ADMIN_SECTIONS.map((s) => [
        s.key,
        levelFor(admin?.permissions ?? [], s.key),
      ])
    )
  );

  return (
    <form action={formAction} className="mt-10 border border-white/10 bg-panel p-8">
      {admin && <input type="hidden" name="id" value={admin.id} />}

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
            className={inputClass}
          />
          <FieldError errors={state.errors?.name} />
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
              className={inputClass}
            />
            <FieldError errors={state.errors?.email} />
          </div>
        )}

        {!admin && (
          <div className="sm:col-span-2">
            <label htmlFor="password" className={labelClass}>
              Temporary password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted">
              Minimum 12 characters with a letter and a digit. The new admin
              must set their own password on first sign-in.
            </p>
            <FieldError errors={state.errors?.password} />
          </div>
        )}
      </div>

      <p className={`${labelClass} mt-8`}>Section access</p>
      <AccessEditor
        levels={levels}
        onChange={(section, level) =>
          setLevels((prev) => ({ ...prev, [section]: level }))
        }
      />

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`mt-6 border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/40 bg-red-400/10 text-red-300"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          {pending ? "Saving…" : admin ? "Save changes" : "Create admin"}
        </button>
        <Link
          href="/admin/admins"
          className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-volt"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
