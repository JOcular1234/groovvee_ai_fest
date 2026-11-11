-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CITY', 'COUNTRY_FALLBACK');

-- AlterTable
ALTER TABLE "competition_applications" ALTER COLUMN "phone" DROP DEFAULT,
ALTER COLUMN "school" DROP DEFAULT,
ALTER COLUMN "intro" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contact_messages" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "stateProvince" TEXT;

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'CITY',
    "stateProvince" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_region_countryCode_idx" ON "locations"("region", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_stateProvince_countryCode_key" ON "locations"("name", "stateProvince", "countryCode");

-- CreateIndex
CREATE INDEX "events_locationId_idx" ON "events"("locationId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
