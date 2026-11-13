import "server-only";

import { db, withDbRetry } from "@/lib/db";
import {
  queryEventBySlug,
  queryPublicEvents,
  queryPublicEventsInRange,
} from "@/lib/events";
import { queryCityIndex } from "@/lib/locations";
import {
  createToolExecutor,
  type ChatToolDeps,
} from "@/lib/chat/tools";

// Real data access for the chat event tools — the same published-only
// queries the public pages use (lib/events.ts publicWhere always includes
// published: true). Called directly rather than through the lib/public
// "use cache" wrappers so tool results always reflect the live database and
// this module stays plain server code.

const deps: ChatToolDeps = {
  search: (filters, when) =>
    withDbRetry(async () => {
      const { events } = await queryPublicEvents(db, filters, when, 1);
      return events;
    }),
  inRange: (from, to, filters) =>
    withDbRetry(() => queryPublicEventsInRange(db, from, to, filters)),
  bySlug: (slug) => withDbRetry(() => queryEventBySlug(db, slug)),
  cityIndex: (filters) => withDbRetry(() => queryCityIndex(db, filters)),
};

export const chatToolExecutor = createToolExecutor(deps);
