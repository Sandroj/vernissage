-- attribution_note was Dutch-only free text, so the amber disputed-attribution
-- caveat stayed in Dutch even on the English locale. Add an English variant,
-- same pattern as Artist.bio_en / nationality_en.
ALTER TABLE "Artwork" ADD COLUMN "attribution_note_en" TEXT;
