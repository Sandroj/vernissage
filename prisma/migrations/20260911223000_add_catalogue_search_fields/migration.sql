ALTER TABLE "Artwork" ADD COLUMN "catalogue_id" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "alternate_titles" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "location_confidence" TEXT;
ALTER TABLE "Artwork" ADD COLUMN "location_verified_at" DATETIME;

CREATE UNIQUE INDEX "Artwork_catalogue_id_key" ON "Artwork"("catalogue_id");
CREATE INDEX "Artwork_title_idx" ON "Artwork"("title");
