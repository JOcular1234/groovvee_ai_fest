-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('KEYNOTE', 'TALK', 'PANEL', 'WORKSHOP', 'DEMO', 'NETWORKING', 'BREAK', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketKind" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('COMING_SOON', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "imageUrl" TEXT,
    "socials" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'TALK',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "TicketKind" NOT NULL,
    "priceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "totalQuantity" INTEGER,
    "maxPerOrder" INTEGER NOT NULL DEFAULT 10,
    "salesStartAt" TIMESTAMP(3),
    "salesEndAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_settings" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "tagline" TEXT,
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "address" TEXT,
    "description" TEXT,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'COMING_SOON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AgendaItemToSpeaker" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgendaItemToSpeaker_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "speakers_published_featured_sortOrder_idx" ON "speakers"("published", "featured", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_published_sortOrder_idx" ON "topics"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "agenda_items_startsAt_idx" ON "agenda_items"("startsAt");

-- CreateIndex
CREATE INDEX "agenda_items_published_sortOrder_idx" ON "agenda_items"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "ticket_types_isActive_sortOrder_idx" ON "ticket_types"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "_AgendaItemToSpeaker_B_index" ON "_AgendaItemToSpeaker"("B");

-- AddForeignKey
ALTER TABLE "_AgendaItemToSpeaker" ADD CONSTRAINT "_AgendaItemToSpeaker_A_fkey" FOREIGN KEY ("A") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgendaItemToSpeaker" ADD CONSTRAINT "_AgendaItemToSpeaker_B_fkey" FOREIGN KEY ("B") REFERENCES "speakers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
