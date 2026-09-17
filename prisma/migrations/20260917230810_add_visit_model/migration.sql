-- CreateTable
CREATE TABLE "Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "artworkId" INTEGER NOT NULL,
    "dateSeen" DATETIME NOT NULL,
    "locationSeen" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "photo_url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Visit_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Visit_userId_artworkId_idx" ON "Visit"("userId", "artworkId");

-- CreateIndex
CREATE INDEX "Visit_artworkId_idx" ON "Visit"("artworkId");
