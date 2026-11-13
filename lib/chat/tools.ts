import { z } from "zod";

import { eventDateKeys, TZ_FETCH_BUFFER_DAYS } from "@/lib/calendar";
import { formatEventDateTime } from "@/lib/datetime";
import type { PublicEventFilters } from "@/lib/events";
import type { CityIndexResult } from "@/lib/locations";
import type { ChatToolDecl } from "@/lib/chat/gemini";

// Event tools for the chat assistant. Pure module: every capability takes an
// injected ChatToolDeps so tests can fake the data layer — real deps are
// bound in lib/chat/tool-deps.ts (server-only) and wired by the API route.
// All access goes through the existing public queries, which filter to
// published events only — unpublished rows and pending discovery candidates
// can never leak through these tools.

const str = (max: number) => z.string().trim().min(1).max(max);
const limitSchema = z.number().int().min(1).max(10).default(6);
const sourceSchema = z.enum(["GROOVVEE", "EXTERNAL"]);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const filtersShape = {
  city: str(80).optional(),
  country: str(80).optional(),
  region: str(80).optional(),
  source: sourceSchema.optional(),
  online: z.boolean().optional(),
  limit: limitSchema,
} as const;

export const toolArgSchemas = {
  searchEvents: z
    .object({
      query: str(120).optional(),
      when: z.enum(["upcoming", "past"]).default("upcoming"),
      dateFrom: dateSchema.optional(),
      dateTo: dateSchema.optional(),
      ...filtersShape,
    })
    .refine(
      (d) => !d.dateFrom || !d.dateTo || d.dateFrom <= d.dateTo,
      { error: "dateFrom must precede dateTo" }
    ),
  listUpcomingEvents: z.object(filtersShape),
  getEventDetails: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "expected an event slug"),
  }),
  eventsByDateRange: z
    .object({
      dateFrom: dateSchema,
      dateTo: dateSchema,
      ...filtersShape,
    })
    .refine(
      (d) =>
        d.dateFrom <= d.dateTo &&
        Date.parse(d.dateTo) - Date.parse(d.dateFrom) <=
          366 * 86_400_000,
      { error: "dateFrom must precede dateTo within a ~1 year window" }
    ),
  listEventLocations: z.object({
    region: str(80).optional(),
    country: str(80).optional(),
    query: str(80).optional(),
  }),
} as const;

export type ChatToolName = keyof typeof toolArgSchemas;

const filterProps = {
  city: { type: "string", description: "City name substring" },
  country: { type: "string", description: "Country name" },
  region: {
    type: "string",
    description: 'World region, e.g. "North America", "Africa", "Europe"',
  },
  source: {
    type: "string",
    enum: ["GROOVVEE", "EXTERNAL"],
    description:
      "GROOVVEE = organised by GrooVVee; EXTERNAL = community events GrooVVee discovered and published",
  },
  online: {
    type: "boolean",
    description: "true = online events only, false = in-person only",
  },
  limit: {
    type: "integer",
    minimum: 1,
    maximum: 10,
    description: "Max results, default 6",
  },
} as const;

export const CHAT_TOOL_DECLS: ChatToolDecl[] = [
  {
    name: "searchEvents",
    description:
      "Search published GrooVVee events by text and/or filters. Use for questions mentioning a topic, place, organiser type, or online/in-person.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text search over event title, city and venue",
        },
        when: {
          type: "string",
          enum: ["upcoming", "past"],
          description: "upcoming (default) or past events",
        },
        dateFrom: {
          type: "string",
          description: "Optional YYYY-MM-DD; filters by event-local date",
        },
        dateTo: { type: "string", description: "Optional YYYY-MM-DD" },
        ...filterProps,
      },
    },
  },
  {
    name: "listUpcomingEvents",
    description:
      "List upcoming published events, optionally filtered by place, source or online status. Use for 'what's coming up' questions.",
    parametersJsonSchema: {
      type: "object",
      properties: filterProps,
    },
  },
  {
    name: "getEventDetails",
    description:
      "Get full details for one published event by its slug (from earlier tool results).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The event's slug" },
      },
      required: ["slug"],
    },
  },
  {
    name: "eventsByDateRange",
    description:
      "List published events overlapping an explicit date range (YYYY-MM-DD, event-local dates). Use for 'this weekend', 'in December', 'next month' etc. after resolving the dates.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string", description: "YYYY-MM-DD" },
        dateTo: { type: "string", description: "YYYY-MM-DD" },
        ...filterProps,
      },
      required: ["dateFrom", "dateTo"],
    },
  },
  {
    name: "listEventLocations",
    description:
      "List cities that currently host published events, with counts. Use to answer 'where do you have events' or check whether a city/region has anything published.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        region: filterProps.region,
        country: filterProps.country,
        query: {
          type: "string",
          description: "City name substring",
        },
      },
    },
  },
];

// Minimal event row shape every dep returns — mirrors the publicSelect
// fields used below so tools stay portable across data sources.
export type ChatEventRow = {
  title: string;
  slug: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  region: string | null;
  venueName: string | null;
  isOnline: boolean;
  url: string | null;
  source: string;
  community: { name: string; slug: string } | null;
};

export interface ChatToolDeps {
  search(
    filters: PublicEventFilters,
    when: "upcoming" | "past"
  ): Promise<ChatEventRow[]>;
  inRange(
    from: Date,
    to: Date,
    filters: PublicEventFilters
  ): Promise<ChatEventRow[]>;
  bySlug(slug: string): Promise<ChatEventRow | null>;
  cityIndex(filters: {
    q?: string;
    region?: string;
    country?: string;
  }): Promise<CityIndexResult>;
}

export function serializeEvent(e: ChatEventRow): Record<string, unknown> {
  return {
    title: e.title,
    slug: e.slug,
    url: `/events/${e.slug}`,
    startsAt: formatEventDateTime(e.startsAt, e.timezone),
    endsAt: e.endsAt ? formatEventDateTime(e.endsAt, e.timezone) : null,
    timezone: e.timezone,
    city: e.city,
    stateProvince: e.stateProvince,
    country: e.country,
    region: e.region,
    venue: e.venueName,
    online: e.isOnline,
    organiser: e.source === "GROOVVEE" ? "GrooVVee" : "external (discovered)",
    community: e.community?.name ?? null,
    registrationUrl: e.url,
  };
}

// True when any local calendar date the event occupies falls inside
// [dateFrom, dateTo] — event-local dates via the existing calendar util,
// never UTC-only assumptions.
export function eventOverlapsLocalRange(
  e: Pick<ChatEventRow, "startsAt" | "endsAt" | "timezone">,
  dateFrom: string,
  dateTo: string
): boolean {
  return eventDateKeys(e).some((k) => k >= dateFrom && k <= dateTo);
}

type Filters = {
  city?: string;
  country?: string;
  region?: string;
  source?: "GROOVVEE" | "EXTERNAL";
  online?: boolean;
};

function toPublicFilters(a: Filters): PublicEventFilters {
  return {
    city: a.city,
    country: a.country,
    region: a.region,
    source: a.source,
    isOnline: a.online,
  };
}

async function rangeEvents(
  deps: ChatToolDeps,
  dateFrom: string,
  dateTo: string,
  filters: PublicEventFilters,
  limit: number
) {
  // Fetch widened by the existing timezone buffer, then keep only events
  // whose event-local dates actually overlap the requested range.
  const from = new Date(Date.parse(`${dateFrom}T00:00:00Z`));
  const to = new Date(Date.parse(`${dateTo}T00:00:00Z`));
  const rows = await deps.inRange(
    new Date(from.getTime() - TZ_FETCH_BUFFER_DAYS * 86_400_000),
    new Date(to.getTime() + TZ_FETCH_BUFFER_DAYS * 86_400_000),
    filters
  );
  return rows
    .filter((e) => eventOverlapsLocalRange(e, dateFrom, dateTo))
    .slice(0, limit)
    .map(serializeEvent);
}

export type ToolExecutor = (
  name: string,
  args: unknown
) => Promise<Record<string, unknown>>;

type HandlerMap = {
  [K in ChatToolName]: (
    a: z.infer<(typeof toolArgSchemas)[K]>,
    deps: ChatToolDeps
  ) => Promise<Record<string, unknown>>;
};

const handlers: HandlerMap = {
  async searchEvents(a, deps) {
    const filters = { ...toPublicFilters(a), q: a.query };
    const events =
      a.dateFrom || a.dateTo
        ? await rangeEvents(
            deps,
            a.dateFrom ?? "1970-01-01",
            a.dateTo ?? "9999-12-31",
            filters,
            a.limit
          )
        : (await deps.search(filters, a.when))
            .slice(0, a.limit)
            .map(serializeEvent);
    return { count: events.length, events };
  },
  async listUpcomingEvents(a, deps) {
    const events = (await deps.search(toPublicFilters(a), "upcoming"))
      .slice(0, a.limit)
      .map(serializeEvent);
    return { count: events.length, events };
  },
  async getEventDetails(a, deps) {
    const e = await deps.bySlug(a.slug);
    if (!e) {
      return { found: false, error: "No published event with that slug." };
    }
    return {
      found: true,
      event: { ...serializeEvent(e), description: e.description.slice(0, 800) },
    };
  },
  async eventsByDateRange(a, deps) {
    const events = await rangeEvents(
      deps,
      a.dateFrom,
      a.dateTo,
      toPublicFilters(a),
      a.limit
    );
    return {
      dateFrom: a.dateFrom,
      dateTo: a.dateTo,
      count: events.length,
      events,
    };
  },
  async listEventLocations(a, deps) {
    const idx = await deps.cityIndex({
      q: a.query,
      region: a.region,
      country: a.country,
    });
    return {
      cities: idx.cities.slice(0, 15).map((c) => ({
        name: c.name,
        stateProvince: c.stateProvince,
        country: c.country,
        region: c.region,
        upcomingEvents: c.upcomingCount,
        publishedEvents: c.publishedCount,
        url: `/events/cities/${c.slug}`,
      })),
      regions: idx.regions,
      countries: idx.countries,
    };
  },
};

export function isChatToolName(name: string): name is ChatToolName {
  return name in toolArgSchemas;
}

export function createToolExecutor(deps: ChatToolDeps): ToolExecutor {
  return async (name, rawArgs) => {
    if (!isChatToolName(name)) return { error: `Unknown tool "${name}"` };

    const parsed = toolArgSchemas[name].safeParse(rawArgs ?? {});
    if (!parsed.success) {
      return {
        error: `Invalid arguments for ${name}: ${parsed.error.issues
          .map((i) => `${i.path.join(".") || "args"} ${i.message}`)
          .join("; ")
          .slice(0, 300)}`,
      };
    }

    try {
      return await handlers[name](parsed.data as never, deps);
    } catch {
      return { error: "The event lookup is temporarily unavailable." };
    }
  };
}
