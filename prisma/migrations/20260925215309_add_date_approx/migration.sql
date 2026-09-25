-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Seen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "artworkId" INTEGER NOT NULL,
    "dateSeen" DATETIME NOT NULL,
    "dateApprox" BOOLEAN NOT NULL DEFAULT false,
    "locationSeen" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "photo_url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Seen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seen_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Seen" ("artworkId", "createdAt", "dateSeen", "id", "locationSeen", "notes", "photo_url", "rating", "userId")
  SELECT "artworkId", "createdAt", "dateSeen", "id", "locationSeen", "notes", "photo_url", "rating", "userId" FROM "Seen";
DROP TABLE "Seen";
ALTER TABLE "new_Seen" RENAME TO "Seen";
CREATE INDEX "Seen_userId_idx" ON "Seen"("userId");
CREATE INDEX "Seen_artworkId_idx" ON "Seen"("artworkId");
CREATE UNIQUE INDEX "Seen_userId_artworkId_key" ON "Seen"("userId", "artworkId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
