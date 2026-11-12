"use client";

import { useActionState } from "react";

import {
  runDiscoveryAction,
  type DiscoveryFormState,
} from "@/app/admin/(protected)/discoveries/actions";
import { DISCOVERY_CATEGORIES } from "@/lib/validation/discovery";

const initialState: DiscoveryFormState = { ok: false };

const selectClass =
  "w-full border border-white/15 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-volt";
const labelClass =
  "mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

export function DiscoveryRunForm({
  regions,
  countries,
  cities,
  dateFrom,
  dateTo,
}: {
  regions: string[];
  countries: string[];
  cities: { name: string; country: string }[];
  dateFrom: string;
  dateTo: string;
}) {
  const [state, formAction, pending] = useActionState(
    runDiscoveryAction,
    initialState
  );

  return (
    <form action={formAction} className="border border-white/10 bg-panel p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="region" className={labelClass}>
            Region
          </label>
          <select id="region" name="region" className={selectClass} defaultValue="">
            <option value="">Any region</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <select id="country" name="country" className={selectClass} defaultValue="">
            <option value="">Any country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <select id="city" name="city" className={selectClass} defaultValue="">
            <option value="">Any city</option>
            {cities.map((c) => (
              <option key={`${c.name}-${c.country}`} value={c.name}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className={labelClass}>Categories</legend>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_CATEGORIES.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[11px] text-white has-checked:border-volt has-checked:text-volt"
            >
              <input
                type="checkbox"
                name="categories"
                value={c.value}
                className="accent-[#ffd600]"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="dateFrom" className={labelClass}>
            From
          </label>
          <input
            id="dateFrom"
            name="dateFrom"
            type="date"
            defaultValue={dateFrom}
            className={selectClass}
            required
          />
        </div>
        <div>
          <label htmlFor="dateTo" className={labelClass}>
            To
          </label>
          <input
            id="dateTo"
            name="dateTo"
            type="date"
            defaultValue={dateTo}
            className={selectClass}
            required
          />
          {state.errors?.dateTo?.[0] && (
            <p className="mt-1 text-xs text-red-400">{state.errors.dateTo[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="maxResults" className={labelClass}>
            Max candidates
          </label>
          <select
            id="maxResults"
            name="maxResults"
            className={selectClass}
            defaultValue="10"
          >
            {[5, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-volt bg-volt px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity disabled:opacity-50"
        >
          {pending ? "Discovering…" : "Run discovery"}
        </button>
        <p className="text-xs text-muted">
          One run at a time · {pending ? "searching the web with Gemini…" : "uses Google Search grounding — results always need review"}
        </p>
      </div>
      {state.message && (
        <p
          className={`mt-3 text-sm ${state.ok ? "text-volt" : "text-red-400"}`}
          role="status"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
