ALTER TABLE "Artwork" ADD COLUMN "jh_catalogue_id" TEXT;

CREATE INDEX "Artwork_jh_catalogue_id_idx" ON "Artwork"("jh_catalogue_id");
