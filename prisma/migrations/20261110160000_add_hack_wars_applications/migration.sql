-- AlterTable
ALTER TABLE "competition_applications" ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "school" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "major" TEXT,
ADD COLUMN     "gradYear" INTEGER,
ADD COLUMN     "intro" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "previousExperience" TEXT,
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT;

-- AlterTable
ALTER TABLE "competition_participants" ADD COLUMN     "school" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "competition_applications_competitionId_email_key" ON "competition_applications"("competitionId", "email");

-- CreateIndex
CREATE INDEX "competition_applications_teamId_idx" ON "competition_applications"("teamId");

-- AddForeignKey
ALTER TABLE "competition_applications" ADD CONSTRAINT "competition_applications_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
