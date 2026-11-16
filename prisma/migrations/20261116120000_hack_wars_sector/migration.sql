-- Expand the shared creative/industry taxonomy so Hack Wars applicants can
-- pick from the full set of top sectors.
ALTER TYPE "CommunityCategory" ADD VALUE 'AGRICULTURE';
ALTER TYPE "CommunityCategory" ADD VALUE 'ENERGY';
ALTER TYPE "CommunityCategory" ADD VALUE 'MANUFACTURING';
ALTER TYPE "CommunityCategory" ADD VALUE 'GAMING';
ALTER TYPE "CommunityCategory" ADD VALUE 'MEDIA';
ALTER TYPE "CommunityCategory" ADD VALUE 'TRAVEL';
ALTER TYPE "CommunityCategory" ADD VALUE 'GOVERNMENT';

-- The industry/sector a Hack Wars applicant intends to compete in.
ALTER TABLE "competition_applications" ADD COLUMN "sector" "CommunityCategory";
CREATE INDEX "competition_applications_sector_idx" ON "competition_applications"("sector");
