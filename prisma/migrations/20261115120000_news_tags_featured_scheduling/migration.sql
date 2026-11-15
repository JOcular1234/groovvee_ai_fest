-- News: tags, a single featured post, and stored reading time.
-- Scheduling needs no column: a published post with a future publishedAt is
-- scheduled, and public queries filter on publishedAt <= now().

-- AlterTable
ALTER TABLE "news_posts" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingMinutes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "news_posts_tags_idx" ON "news_posts" USING GIN ("tags");

-- At most one featured post (not expressible in Prisma schema).
CREATE UNIQUE INDEX "news_posts_single_featured" ON "news_posts" ("featured") WHERE "featured";

-- Backfill reading time for existing posts (~200 words per minute).
UPDATE "news_posts"
SET "readingMinutes" = GREATEST(
  1,
  CEIL(COALESCE(array_length(regexp_split_to_array(btrim("body"), '\s+'), 1), 0) / 200.0)::int
);
