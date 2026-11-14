-- AlterTable: admin two-factor authentication
ALTER TABLE "admins" ADD COLUMN     "recoveryCodeHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpSecretEnc" TEXT;

-- AlterTable: registration double opt-in
ALTER TABLE "event_registrations" ADD COLUMN     "confirmSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmTokenHash" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- Registrations made before double opt-in existed stay valid.
UPDATE "event_registrations" SET "confirmedAt" = "createdAt" WHERE "confirmedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_confirmTokenHash_key" ON "event_registrations"("confirmTokenHash");
