import type { Prisma } from "@/lib/generated/prisma/client";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type {
  MessageStatusValue,
  MessageSubmitInput,
} from "@/lib/validation/message";

export const ADMIN_MESSAGES_PAGE_SIZE = 20;

export type AdminMessageFilters = {
  q?: string;
  page?: number;
  type?: string;
  status?: MessageStatusValue;
  // "unread" → readAt is null; "read" → readAt is set.
  read?: "unread" | "read";
};

export async function listMessagesForAdmin(
  db: PrismaClient,
  opts: AdminMessageFilters = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.ContactMessageWhereInput = {};
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { email: { contains: opts.q, mode: "insensitive" } },
      { subject: { contains: opts.q, mode: "insensitive" } },
      { message: { contains: opts.q, mode: "insensitive" } },
    ];
  }
  if (opts.type) where.type = opts.type as Prisma.ContactMessageWhereInput["type"];
  if (opts.status) where.status = opts.status;
  if (opts.read === "unread") where.readAt = null;
  if (opts.read === "read") where.readAt = { not: null };

  const [total, messages] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * ADMIN_MESSAGES_PAGE_SIZE,
      take: ADMIN_MESSAGES_PAGE_SIZE,
    }),
  ]);

  return {
    messages,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ADMIN_MESSAGES_PAGE_SIZE)),
  };
}

export async function getMessageById(db: PrismaClient, id: string) {
  return db.contactMessage.findUnique({
    where: { id },
    include: {
      reviewer: { select: { id: true, name: true } },
    },
  });
}

// Public submission — always NEW/unread, never reviewer/status/notes fields.
export async function submitMessage(
  db: PrismaClient,
  input: MessageSubmitInput
) {
  return db.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      type: input.type,
      subject: input.subject,
      message: input.message,
    },
  });
}

// Opening a message: stamps readAt once and moves NEW → READ. Messages that
// are already past NEW keep both their status and their original readAt.
export async function markMessageRead(db: PrismaClient, id: string) {
  const existing = await db.contactMessage.findUnique({
    where: { id },
    select: { id: true, status: true, readAt: true },
  });
  if (!existing) return null;
  if (existing.readAt && existing.status !== "NEW") return existing;
  return db.contactMessage.update({
    where: { id },
    data: {
      readAt: existing.readAt ?? new Date(),
      ...(existing.status === "NEW" ? { status: "READ" as const } : {}),
    },
  });
}

export async function setMessageStatus(
  db: PrismaClient,
  id: string,
  adminId: string,
  status: MessageStatusValue
) {
  const existing = await db.contactMessage.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.contactMessage.update({
    where: { id },
    data: { status, reviewerId: adminId, reviewedAt: new Date() },
  });
}

export async function updateMessageNotes(
  db: PrismaClient,
  id: string,
  adminId: string,
  notes: string | null
) {
  const existing = await db.contactMessage.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;
  return db.contactMessage.update({
    where: { id },
    data: { reviewNotes: notes || null, reviewerId: adminId, reviewedAt: new Date() },
  });
}
