-- CreateEnum
CREATE TYPE "CommunityCategory" AS ENUM ('FILM', 'MUSIC', 'FASHION', 'ADVERTISING', 'REAL_ESTATE', 'LEGAL', 'FINANCE', 'ARCHITECTURE', 'CONSTRUCTION', 'HEALTHCARE', 'TELECOM', 'EDUCATION', 'SUSTAINABILITY', 'MOBILITY', 'CONSUMER_PRODUCTS');

-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "category" "CommunityCategory";

-- CreateIndex
CREATE INDEX "communities_category_published_idx" ON "communities"("category", "published");
