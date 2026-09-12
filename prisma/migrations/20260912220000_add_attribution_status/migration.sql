-- General-purpose attribution flag: some canonical works (across any artist)
-- have contested authorship. Default 'accepted' keeps existing rows unchanged;
-- 'disputed' + a note surface the caveat in the UI instead of silently
-- treating the work as equally certain as the rest of the oeuvre.
ALTER TABLE "Artwork" ADD COLUMN "attribution_status" TEXT DEFAULT 'accepted';
ALTER TABLE "Artwork" ADD COLUMN "attribution_note" TEXT;
