/*
  Warnings:

  - Added the required column `updatedAt` to the `contact_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'READ', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_readAt_idx" ON "contact_messages"("readAt");

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
