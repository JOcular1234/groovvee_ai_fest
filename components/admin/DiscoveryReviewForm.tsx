"use client";

import { useActionState, useRef, useState } from "react";

import {
  approveCandidateAction,
  type DiscoveryFormState,
} from "@/app/admin/(protected)/discoveries/actions";
import { locationLabel } from "@/lib/locations";

type LocationOption = {
  id: string;
  name: string;
  type: string;
  stateProvince: string;
  country: string;
  countryCode: string;
  region: string;
};

export type ReviewFormValues = {
  title: string;
  description: string;
  startsAt: string; // datetime-local
  endsAt: string;
  timezone: string;
  city: string;
  stateProvince: string;
  country: string;
  region: string;
  venueName: string;
  isOnline: boolean;
  url: string;
  imageUrl: string;
  externalId: string;
  locationId: string;
};

const initialState: DiscoveryFormState = { ok: false };
const inputClass =
  "w-full border border-white/15 bg-ink px-4 py-3 text-sm text-white placeholder:text-muted/50 outline-none transition-colors focus:border-volt";
const labelClass =
  "mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted";

const TIMEZONES: string[] =
  typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{errors[0]}</p>;
}

export function DiscoveryReviewForm({
  candidateId,
  initial,
  locations,
  missingFields,
}: {
  candidateId: string;
  initial: ReviewFormValues;
  locations: LocationOption[];
  missingFields: string[];
}) {
  const action = approveCandidateAction.bind(null, candidateId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [locationId, setLocationId] = useState(initial.locationId);
  const [locationQuery, setLocationQuery] = useState("");
  const lq = locationQuery.trim().toLowerCase();
  const locationMatches = lq
    ? locations.filter((l) => locationLabel(l).toLowerCase().includes(lq))
    : locations;
  const selectedLocation = locations.find((l) => l.id === locationId);
  const flagged = new Set(missingFields);
  const mark = (f: string) =>
    flagged.has(f) ? (
      <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-amber-400">
        missing
      </span>
    ) : null;
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="border border-white/10 bg-panel p-6 sm:p-8">
      <input type="hidden" name="locationId" value={locationId} />
      {/* Legacy geo passes through untouched unless a Location is chosen —
          the server derives city/country/region from the Location. */}
      <input type="hidden" name="city" value={initial.city} />
      <input type="hidden" name="stateProvince" value={initial.stateProvince} />
      <input type="hidden" name="country" value={initial.country} />
      <input type="hidden" name="region" value={initial.region} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className={labelClass}>
            Title *
          </label>
          <input id="title" name="title" defaultValue={initial.title} className={inputClass} required />
          <FieldError errors={state.errors?.title} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className={labelClass}>
            Description *{mark("description")}
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={initial.description}
            rows={5}
            className={inputClass}
            required
          />
          <FieldError errors={state.errors?.description} />
        </div>
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Starts *{mark("startsAt")}
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={initial.startsAt}
            className={inputClass}
            required
          />
          <FieldError errors={state.errors?.startsAtLocal} />
        </div>
        <div>
          <label htmlFor="endsAt" className={labelClass}>
            Ends{mark("endsAt")}
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={initial.endsAt}
            className={inputClass}
          />
          <FieldError errors={state.errors?.endsAtLocal} />
        </div>
        <div>
          <label htmlFor="timezone" className={labelClass}>
            Timezone *{mark("timezone")}
          </label>
          <select id="timezone" name="timezone" defaultValue={initial.timezone} className={inputClass}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.timezone} />
        </div>
        <div>
          <label className={labelClass}>
            Location{mark("location")}
          </label>
          {selectedLocation ? (
            <div className="flex items-center justify-between border border-volt/40 bg-ink px-4 py-3">
              <span className="text-sm text-white">
                {locationLabel(selectedLocation)}
                {selectedLocation.type === "COUNTRY_FALLBACK" && (
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-volt">
                    Country
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setLocationId("")}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-volt"
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search locations…"
                className={inputClass}
              />
              <div className="mt-1 max-h-44 overflow-y-auto border border-white/10">
                {locationMatches.slice(0, 30).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLocationId(l.id);
                      setLocationQuery("");
                    }}
                    className="block w-full border-b border-white/5 px-4 py-2.5 text-left text-sm text-white hover:bg-ink hover:text-volt"
                  >
                    {locationLabel(l)}
                    {l.type === "COUNTRY_FALLBACK" && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-volt">
                        Country
                      </span>
                    )}
                  </button>
                ))}
                {locationMatches.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted">No locations match.</p>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                Extracted: {[initial.city, initial.stateProvince, initial.country]
                  .filter(Boolean)
                  .join(", ") || "none"}
                {!locationId && " — kept as text unless a location is picked."}
              </p>
            </>
          )}
          <FieldError errors={state.errors?.locationId} />
        </div>
        <div>
          <label htmlFor="venueName" className={labelClass}>
            Venue{mark("venue")}
          </label>
          <input id="venueName" name="venueName" defaultValue={initial.venueName} className={inputClass} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-white">
            <input
              type="checkbox"
              name="isOnline"
              defaultChecked={initial.isOnline}
              className="size-4 accent-[#ffd600]"
            />
            Online event
          </label>
        </div>
        <div>
          <label htmlFor="url" className={labelClass}>
            Registration URL (https){mark("registrationUrl")}
          </label>
          <input id="url" name="url" type="url" defaultValue={initial.url} className={inputClass} />
          <FieldError errors={state.errors?.url} />
        </div>
        <div>
          <label htmlFor="imageUrl" className={labelClass}>
            Image URL
          </label>
          <input id="imageUrl" name="imageUrl" defaultValue={initial.imageUrl} className={inputClass} />
          <FieldError errors={state.errors?.imageUrl} />
        </div>
        <div>
          <label htmlFor="externalId" className={labelClass}>
            External ID
          </label>
          <input id="externalId" name="externalId" defaultValue={initial.externalId} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reviewNotes" className={labelClass}>
            Review notes (internal)
          </label>
          <textarea
            id="reviewNotes"
            name="reviewNotes"
            rows={2}
            className={inputClass}
            placeholder="Optional notes for other admins…"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-volt bg-volt px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-opacity disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Approve & publish"}
        </button>
        <p className="text-xs text-muted">
          Creates a published EXTERNAL event linked to this candidate.
        </p>
      </div>
      {state.message && (
        <p className={`mt-3 text-sm ${state.ok ? "text-volt" : "text-red-400"}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
