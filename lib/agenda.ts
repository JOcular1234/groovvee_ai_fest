import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { zonedToUtc } from "@/lib/datetime";
import type { AgendaInput } from "@/lib/validation/agenda";

export const ADMIN_AGENDA_PAGE_SIZE = 20;

const adminOrderBy: Prisma.AgendaItemOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { startsAt: "asc" },
  { id: "asc" },
];

export type AdminAgendaFilters = {
  q?: string;
  page?: number;
  eventId?: string;
  status?: "published" | "draft";
  type?: string;
};

export async function listAgendaForAdmin(
  db: PrismaClient,
  opts: AdminAgendaFilters = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.AgendaItemWhereInput = {};
  if (opts.q) {
    where.OR = [
      { title: { contains: opts.q, mode: "insensitive" } },
      { location: { contains: opts.q, mode: "insensitive" } },
    ];
  }
  if (opts.eventId === "none") where.eventId = null;
  else if (opts.eventId) where.eventId = opts.eventId;
  if (opts.status) where.published = opts.status === "published";
  if (opts.type) where.type = opts.type as Prisma.AgendaItemWhereInput["type"];

  const [total, items] = await Promise.all([
    db.agendaItem.count({ where }),
    db.agendaItem.findMany({
      where,
      orderBy: adminOrderBy,
      skip: (page - 1) * ADMIN_AGENDA_PAGE_SIZE,
      take: ADMIN_AGENDA_PAGE_SIZE,
      include: {
        event: { select: { title: true, slug: true } },
        _count: { select: { speakers: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_AGENDA_PAGE_SIZE)),
  };
}

export async function getAgendaItemById(db: PrismaClient, id: string) {
  return db.agendaItem.findUnique({
    where: { id },
    include: { speakers: { select: { id: true } } },
  });
}

export async function listSpeakersForSelect(db: PrismaClient) {
  return db.speaker.findMany({
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, organization: true },
  });
}

// Published events for the selector. When `includeId` is set (editing an item
// linked to a now-unpublished event), that event is included too, so the
// existing association is preserved rather than silently dropped.
export async function listEventsForAgendaSelect(
  db: PrismaClient,
  includeId?: string | null
) {
  const events = await db.event.findMany({
    where: { OR: [{ published: true }, ...(includeId ? [{ id: includeId }] : [])] },
    orderBy: [{ startsAt: "desc" }],
    select: { id: true, title: true, published: true, timezone: true },
    take: 200,
  });
  return events;
}

// Error sentinels for the actions layer (same convention as lib/events.ts).
export const INVALID_EVENT = "invalid_event";
export const INVALID_DATETIME = "invalid_datetime";

// Resolves the event (validates existence) and converts wall-clock times
// using the event's timezone — UTC when the item is unlinked.
async function agendaData(db: PrismaClient, input: AgendaInput) {
  let timezone = "UTC";
  let eventId: string | null = null;
  if (input.eventId) {
    const event = await db.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, timezone: true },
    });
    if (!event) throw new Error(INVALID_EVENT);
    eventId = event.id;
    timezone = event.timezone;
  }
  const startsAt = zonedToUtc(input.startsAtLocal, timezone);
  const endsAt = zonedToUtc(input.endsAtLocal, timezone);
  if (!startsAt || !endsAt) throw new Error(INVALID_DATETIME);
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    startsAt,
    endsAt,
    location: input.location,
    eventId,
    published: input.published,
    sortOrder: input.sortOrder,
  };
}

export async function createAgendaItem(db: PrismaClient, input: AgendaInput) {
  const data = await agendaData(db, input);
  return db.agendaItem.create({
    data: {
      ...data,
      speakers: { connect: input.speakerIds.map((id) => ({ id })) },
    },
  });
}

export async function updateAgendaItem(
  db: PrismaClient,
  id: string,
  input: AgendaInput
) {
  const existing = await db.agendaItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  const data = await agendaData(db, input);
  return db.agendaItem.update({
    where: { id },
    data: {
      ...data,
      speakers: { set: input.speakerIds.map((sid) => ({ id: sid })) },
    },
  });
}

export async function deleteAgendaItem(db: PrismaClient, id: string) {
  const existing = await db.agendaItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await db.agendaItem.delete({ where: { id } });
  return true;
}

export async function setAgendaPublished(
  db: PrismaClient,
  id: string,
  published: boolean
) {
  const existing = await db.agendaItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.agendaItem.update({ where: { id }, data: { published } });
}

export async function moveAgendaItem(
  db: PrismaClient,
  id: string,
  direction: -1 | 1
): Promise<boolean> {
  const all = await db.agendaItem.findMany({
    orderBy: adminOrderBy,
    select: { id: true },
  });
  const index = all.findIndex((a) => a.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= all.length) return false;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(
    all.map((a, i) =>
      db.agendaItem.update({ where: { id: a.id }, data: { sortOrder: i } })
    )
  );
  return true;
}

// --- Public queries ---

// Programme for a published event page: chronological, sortOrder as
// tie-breaker, published speakers only.
export async function queryEventProgramme(db: PrismaClient, eventId: string) {
  return db.agendaItem.findMany({
    where: { eventId, published: true },
    orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      startsAt: true,
      endsAt: true,
      location: true,
      speakers: {
        where: { published: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          title: true,
          organization: true,
          imageUrl: true,
        },
      },
    },
  });
}
