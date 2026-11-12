import { GoogleGenAI } from "@google/genai";

import type { DiscoveryRunInput } from "@/lib/validation/discovery";
import { DISCOVERY_CATEGORY_VALUES } from "@/lib/validation/discovery";
import type {
  DiscoveryResult,
  EventDiscoveryProvider,
} from "@/lib/discovery/types";
import {
  ProviderNotConfiguredError,
  ProviderRequestError,
} from "@/lib/discovery/types";

// Google Gemini provider — web discovery via Google Search grounding.
// Provider-specific code stays in this module; the rest of the system only
// sees the EventDiscoveryProvider interface.

// Gemini retires models quickly (2.5-flash was pulled and the API told us to
// use 3.8-flash) — keep the model env-overridable so deprecation is a config
// change, not a deploy.
const MODEL = process.env.GEMINI_DISCOVERY_MODEL ?? "gemini-3.8-flash";
const TIMEOUT_MS = 90_000;
// 503 UNAVAILABLE (demand spikes) is common on the free tier — a couple of
// short backoffs ride out most spikes without blocking the admin too long.
const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

// NOTE: responseMimeType/responseSchema can't be combined with tool use
// (Google Search grounding) on Gemini 2.5 — the API rejects it with
// INVALID_ARGUMENT. Structured output is enforced by the prompt + strict
// Zod validation on every candidate instead; malformed rows count as
// invalid, they never crash a run.

const CATEGORY_LABELS: Record<string, string> = {
  conference: "AI conferences and summits",
  hackathon: "AI hackathons and competitions",
  meetup: "AI community meetups",
  workshop: "AI workshops and training programmes",
  campus: "AI student and campus events",
  creative: "AI film, music, fashion, design and creative technology events",
  industry: "AI events in finance, healthcare, education, construction, telecoms and other industries",
};

function buildPrompt(p: DiscoveryRunInput): string {
  const place = [p.city, p.country, p.region].filter(Boolean).join(", ") || "worldwide";
  const cats = p.categories.length
    ? p.categories.map((c) => CATEGORY_LABELS[c] ?? c).join("; ")
    : Object.values(CATEGORY_LABELS).join("; ");
  return [
    `Using Google Search, find up to ${p.maxResults} real upcoming AI-related events ${p.city || p.country || p.region ? `in ${place}` : "worldwide"}.`,
    `Focus on: ${cats}.`,
    `The event must occur between ${p.dateFrom} and ${p.dateTo} (event-local dates).`,
    "Only include events you can corroborate from a public source page. Prefer official event pages over aggregators.",
    "Do NOT include: webinars you cannot date, ads, ordinary blog posts, past events, or events with no meaningful AI connection.",
    "For each event return: title, description, startDate (YYYY-MM-DD or YYYY-MM-DDTHH:mm, event-local), endDate, timezone (IANA name, e.g. Africa/Lagos), venueName, city, stateProvince, country, registrationUrl, sourceUrl (the page you found it on — required), imageUrl, category (one of: " + DISCOVERY_CATEGORY_VALUES.join(", ") + "), externalId (any stable id on the source site, else null), confidence (high|medium|low), evidence (short quote/context supporting the facts), missingFields (array of field names you could not confirm).",
    "Never invent dates, venues, URLs or registration links. If unsure, leave the field null and list it in missingFields.",
    'Respond with JSON only: {"events": [...]}',
  ].join("\n");
}

function parseResponseText(text: string | undefined): unknown[] {
  if (!text) throw new ProviderRequestError("Empty provider response", true);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProviderRequestError("Provider returned malformed JSON");
  }
  if (Array.isArray(json)) return json;
  const events = (json as { events?: unknown })?.events;
  return Array.isArray(events) ? events : [];
}

function isRetryable(err: unknown): boolean {
  if (err instanceof ProviderRequestError) return err.retryable;
  const msg = String((err as { message?: string })?.message ?? err);
  return /429|500|502|503|504|timeout|ETIMEDOUT|ECONNRESET|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createGeminiProvider(): EventDiscoveryProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ProviderNotConfiguredError(
      "Event discovery is not configured. Set GEMINI_API_KEY in the server environment."
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    model: MODEL,
    connector: "gemini-search",
    async discover(params: DiscoveryRunInput): Promise<DiscoveryResult> {
      const prompt = buildPrompt(params);
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              abortSignal: AbortSignal.timeout(TIMEOUT_MS),
            },
          });
          return { candidates: parseResponseText(res.text).slice(0, params.maxResults) };
        } catch (err) {
          lastErr = err;
          if (attempt + 1 < MAX_ATTEMPTS && isRetryable(err)) {
            await sleep(RETRY_DELAYS_MS[attempt] ?? 10_000);
            continue;
          }
          throw err instanceof ProviderRequestError
            ? err
            : new ProviderRequestError(
                `Discovery provider request failed: ${String((err as { message?: string })?.message ?? err).slice(0, 300)}`,
                isRetryable(err)
              );
        }
      }
      throw lastErr;
    },
  };
}
