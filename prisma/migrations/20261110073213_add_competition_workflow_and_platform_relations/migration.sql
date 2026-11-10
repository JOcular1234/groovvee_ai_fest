
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InquiryType" ADD VALUE 'SPONSORSHIP';
ALTER TYPE "InquiryType" ADD VALUE 'STUDIO_PARTICIPATION';
ALTER TYPE "InquiryType" ADD VALUE 'EVENTS';

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "eventId" TEXT;

-- AlterTable
ALTER TABLE "speaker_applications" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT;

-- CreateTable
CREATE TABLE "competition_rounds" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_teams" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_participants" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_applications" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "teamId" TEXT,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_submissions" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "roundId" TEXT,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judging_scores" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "judgeId" TEXT,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judging_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competition_rounds_competitionId_sortOrder_idx" ON "competition_rounds"("competitionId", "sortOrder");

-- CreateIndex
CREATE INDEX "competition_teams_competitionId_idx" ON "competition_teams"("competitionId");

-- CreateIndex
CREATE INDEX "competition_participants_teamId_idx" ON "competition_participants"("teamId");

-- CreateIndex
CREATE INDEX "competition_applications_competitionId_status_idx" ON "competition_applications"("competitionId", "status");

-- CreateIndex
CREATE INDEX "challenge_submissions_competitionId_idx" ON "challenge_submissions"("competitionId");

-- CreateIndex
CREATE INDEX "challenge_submissions_teamId_idx" ON "challenge_submissions"("teamId");

-- CreateIndex
CREATE INDEX "judging_scores_submissionId_idx" ON "judging_scores"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "judging_scores_submissionId_judgeId_key" ON "judging_scores"("submissionId", "judgeId");

-- CreateIndex
CREATE INDEX "agenda_items_eventId_idx" ON "agenda_items"("eventId");

-- CreateIndex
CREATE INDEX "speaker_applications_reviewerId_idx" ON "speaker_applications"("reviewerId");

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_rounds" ADD CONSTRAINT "competition_rounds_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_teams" ADD CONSTRAINT "competition_teams_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "competition_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_applications" ADD CONSTRAINT "competition_applications_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_applications" ADD CONSTRAINT "competition_applications_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "competition_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "competition_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "competition_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judging_scores" ADD CONSTRAINT "judging_scores_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "challenge_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judging_scores" ADD CONSTRAINT "judging_scores_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaker_applications" ADD CONSTRAINT "speaker_applications_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

