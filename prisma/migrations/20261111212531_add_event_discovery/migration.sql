-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscoveryReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'RUNNING',
    "eventsFound" INTEGER NOT NULL DEFAULT 0,
    "eventsInserted" INTEGER NOT NULL DEFAULT 0,
    "duplicatesFound" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT,
    "venueName" TEXT,
    "city" TEXT,
    "stateProvince" TEXT,
    "country" TEXT,
    "locationId" TEXT,
    "registrationUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceUrlNormalized" TEXT NOT NULL,
    "imageUrl" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "externalId" TEXT,
    "category" TEXT,
    "confidence" TEXT,
    "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence" TEXT,
    "duplicateOfEventId" TEXT,
    "duplicateOfCandidateId" TEXT,
    "duplicateKind" TEXT,
    "status" "DiscoveryReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovered_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discovery_runs_status_startedAt_idx" ON "discovery_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "discovery_runs_adminId_idx" ON "discovery_runs"("adminId");

-- CreateIndex
CREATE INDEX "discovered_events_status_createdAt_idx" ON "discovered_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "discovered_events_runId_idx" ON "discovered_events"("runId");

-- CreateIndex
CREATE INDEX "discovered_events_locationId_idx" ON "discovered_events"("locationId");

-- CreateIndex
CREATE INDEX "discovered_events_sourceUrlNormalized_idx" ON "discovered_events"("sourceUrlNormalized");

-- CreateIndex
CREATE INDEX "discovered_events_normalizedTitle_idx" ON "discovered_events"("normalizedTitle");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_events_connector_externalId_key" ON "discovered_events"("connector", "externalId");

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "discovery_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_duplicateOfEventId_fkey" FOREIGN KEY ("duplicateOfEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_duplicateOfCandidateId_fkey" FOREIGN KEY ("duplicateOfCandidateId") REFERENCES "discovered_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_reviewerAdminId_fkey" FOREIGN KEY ("reviewerAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_events" ADD CONSTRAINT "discovered_events_approvedEventId_fkey" FOREIGN KEY ("approvedEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
