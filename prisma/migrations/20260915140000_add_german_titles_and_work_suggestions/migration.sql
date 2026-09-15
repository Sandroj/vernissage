ALTER TABLE "Artwork" ADD COLUMN "title_de" TEXT;

CREATE TABLE "WorkSuggestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "artworkId" INTEGER,
    "artworkTitle" TEXT,
    "message" TEXT NOT NULL,
    "senderEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "emailSentAt" DATETIME,
    "emailError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkSuggestion_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "WorkSuggestion_artworkId_idx" ON "WorkSuggestion"("artworkId");
CREATE INDEX "WorkSuggestion_status_idx" ON "WorkSuggestion"("status");
