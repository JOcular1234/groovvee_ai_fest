-- CreateEnum
CREATE TYPE "CommunityType" AS ENUM ('STUDENT_TRIBE', 'CAMPUS', 'CREATIVE', 'INDUSTRY');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('GROOVVEE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "CompetitionKind" AS ENUM ('HACK_WARS', 'CONTEST', 'COMMUNITY_CONTEST');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('UPCOMING', 'REGISTRATION_OPEN', 'RUNNING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('GENERAL', 'PARTNERSHIP', 'PRESS', 'COMMUNITY', 'SPEAKER_APPLICATION');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CommunityType" NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "city" TEXT,
    "country" TEXT,
    "joinUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "city" TEXT,
    "country" TEXT,
    "region" TEXT,
    "venueName" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "imageUrl" TEXT,
    "source" "EventSource" NOT NULL DEFAULT 'GROOVVEE',
    "externalId" TEXT,
    "communityId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "CompetitionKind" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "prizeText" TEXT,
    "rulesUrl" TEXT,
    "imageUrl" TEXT,
    "eventId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "sourceUrl" TEXT,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "InquiryType" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaker_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "talkTitle" TEXT,
    "bio" TEXT NOT NULL,
    "links" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "speakerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speaker_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "communities_type_published_sortOrder_idx" ON "communities"("type", "published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_published_startsAt_idx" ON "events"("published", "startsAt");

-- CreateIndex
CREATE INDEX "events_communityId_idx" ON "events"("communityId");

-- CreateIndex
CREATE INDEX "events_region_published_idx" ON "events"("region", "published");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_kind_published_idx" ON "competitions"("kind", "published");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_slug_key" ON "news_posts"("slug");

-- CreateIndex
CREATE INDEX "news_posts_published_publishedAt_idx" ON "news_posts"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "contact_messages_type_createdAt_idx" ON "contact_messages"("type", "createdAt");

-- CreateIndex
CREATE INDEX "speaker_applications_status_createdAt_idx" ON "speaker_applications"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaker_applications" ADD CONSTRAINT "speaker_applications_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
