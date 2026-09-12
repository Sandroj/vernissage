-- Preserve the evidence trail for artwork images independently from the
-- catalogue metadata source.
ALTER TABLE "Artwork" ADD COLUMN "image_source_url" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "image_source_name" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "image_rights" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "image_retrieved_at" DATETIME;
