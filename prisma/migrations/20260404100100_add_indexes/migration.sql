-- CreateIndex
CREATE INDEX "Artwork_artistId_idx" ON "Artwork"("artistId");

-- CreateIndex
CREATE INDEX "Artwork_museumId_idx" ON "Artwork"("museumId");

-- CreateIndex
CREATE INDEX "Seen_userId_idx" ON "Seen"("userId");

-- CreateIndex
CREATE INDEX "Seen_artworkId_idx" ON "Seen"("artworkId");
