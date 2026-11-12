# AI Event Discovery

Admin-triggered discovery of external AI events, with human review before
anything becomes public. AI proposes; administrators approve.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Only for discovery | Google AI Studio key, server-side only |

Get a key at https://aistudio.google.com/. When unset, the rest of the app
is unaffected and starting a run shows a configuration error.

## Running discovery

Admin → **Discovery** (`/admin/discoveries`):

1. Optionally pick a region, country and/or city, event categories, and a
   date window (required). `maxResults` is capped at 25 per run.
2. **Run discovery** starts a run immediately — manual trigger only, no
   scheduler.
3. Guardrails: one `RUNNING` run at a time, and a 60 s cooldown between
   runs (the provider call is paid). Both are enforced inside the
   transaction that creates the `DiscoveryRun`, so racing clicks can't
   slip two runs in.

The run row records provider, model, the full search params, counts
(found/inserted/duplicates/invalid), and any error summary.

## Provider

`lib/discovery/providers/gemini.ts` — `gemini-2.5-flash` with Google
Search grounding (live web search, not arbitrary URL fetching), a 90 s
`abortSignal` timeout, and one retry on transient errors (429/5xx/network).

To swap providers, implement `EventDiscoveryProvider`
(`lib/discovery/types.ts`) and pass it to `runDiscovery` — the DB schema
and review workflow are provider-agnostic.

**Known API limitation:** `responseMimeType`/`responseSchema` cannot be
combined with tool use on Gemini 2.5, so the prompt demands JSON and
`discoveredCandidateSchema` (Zod) validates every returned candidate.
Malformed rows are counted as `invalid`, never crash the run. When
migrating to a Gemini 3 model, structured output can be re-enabled.

## Candidates

Each valid result becomes a `DiscoveredEvent` with status `PENDING`,
storing: extracted fields, `sourceUrl` (required, where it was found),
`registrationUrl` (distinct — where to register), provider/model/connector,
`externalId`, `confidence`, `evidence` (grounding excerpt) and
`missingFields` (what the model couldn't confirm — nothing is invented).

Dates are kept event-local: `startDate`/`endDate` are resolved to UTC
instants via the extracted IANA `timezone`; a missing timezone or date
leaves the field null and is flagged in `missingFields`. CITY `Location`
records are auto-linked only on an exact case-insensitive city+country
match — anything else is resolved by the reviewer.

## Review & approval

`/admin/discoveries` lists candidates with status tabs, search and
pagination; `/admin/discoveries/[id]` shows everything extracted plus the
source and registration links, possible duplicates, and an edit form.

- **Approve** validates the candidate against `eventFormSchema`, then in
  one transaction: claims the PENDING row (conditional update — double
  approval is impossible), creates the `Event` via the existing
  `createEvent` service with `source: EXTERNAL`, and links
  `approvedEventId`. Any failure rolls back and the candidate stays
  reviewable. `registrationUrl` maps to `Event.url`; the original
  `sourceUrl` stays on the candidate for attribution.
- **Reject** / **mark duplicate** record status, reviewer, timestamp and
  notes. A duplicate marking can link the matching `Event`.

Approval revalidates the `events` + `locations` cache tags, so approved
events appear across the directory, calendar, cities and map immediately.

## Duplicate detection

Exact (candidate skipped or flagged `EXACT`):

- Normalized `sourceUrl` — protocol/`www.`/trailing slash/casing, tracking
  params (`utm_*`, `fbclid`, `gclid`, `ref*`, `mc_*`) stripped, remaining
  params sorted.
- `(connector, externalId)` — unique constraint; exact matches are not
  re-inserted.
- `Event.url` matching source or registration URL.

Fuzzy (flagged `FUZZY`, **never auto-merged**): normalized-title overlap
against `Event` rows and other candidates near the date/location. The
reviewer decides.

## Cost & safety controls

- `maxResults` ≤ 25 per run; results sliced to the bound.
- Manual trigger only — no cron/queue in this stage.
- API key never reaches the browser; provider errors surface as generic
  admin messages while detail stays on the run row.
- No server-side fetching of arbitrary URLs (SSRF-free by design); the
  provider's own search grounding supplies discovery.
- HTTP/HTTPS-only URL validation everywhere; `javascript:` etc. rejected.
- Unapproved candidates have no public surface — they only ever become
  `Event` rows through the review action.

## Deployment

1. `npx prisma migrate deploy` — applies `20261111212531_add_event_discovery`.
2. Set `GEMINI_API_KEY` in the server environment.
3. `npx prisma generate` if the client wasn't regenerated on install.

Tests: `npm run test:discovery` (provider is mocked — no paid API calls).
