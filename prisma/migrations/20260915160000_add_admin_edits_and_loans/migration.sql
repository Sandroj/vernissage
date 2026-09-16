CREATE TABLE "Loan" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "artworkId" INTEGER NOT NULL,
  "fromMuseumId" INTEGER,
  "fromOwnerName" TEXT,
  "toMuseumId" INTEGER NOT NULL,
  "startAt" DATETIME,
  "endAt" DATETIME,
  "current" BOOLEAN NOT NULL DEFAULT true,
  "sourceUrl" TEXT,
  "verifiedAt" DATETIME,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Loan_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Loan_fromMuseumId_fkey" FOREIGN KEY ("fromMuseumId") REFERENCES "Museum" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Loan_toMuseumId_fkey" FOREIGN KEY ("toMuseumId") REFERENCES "Museum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Loan_artworkId_current_idx" ON "Loan"("artworkId", "current");
CREATE INDEX "Loan_fromMuseumId_current_idx" ON "Loan"("fromMuseumId", "current");
CREATE INDEX "Loan_toMuseumId_current_idx" ON "Loan"("toMuseumId", "current");

CREATE TABLE "ArtworkEdit" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "artworkId" INTEGER NOT NULL,
  "editorEmail" TEXT NOT NULL,
  "beforeJson" TEXT NOT NULL,
  "afterJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtworkEdit_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ArtworkEdit_artworkId_createdAt_idx" ON "ArtworkEdit"("artworkId", "createdAt");
