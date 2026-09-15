/** Apply the artwork-edit log and ownership/loan schema to the live Turso DB. */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(fs.readFileSync(resolve(scriptDir, '../.env.local'), 'utf8')
  .split('\n').filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
  }))
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

async function main() {
  await db.execute(`CREATE TABLE IF NOT EXISTS "Loan" (
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
  )`)
  await db.execute('CREATE INDEX IF NOT EXISTS "Loan_artworkId_current_idx" ON "Loan"("artworkId", "current")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Loan_fromMuseumId_current_idx" ON "Loan"("fromMuseumId", "current")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Loan_toMuseumId_current_idx" ON "Loan"("toMuseumId", "current")')
  await db.execute(`CREATE TABLE IF NOT EXISTS "ArtworkEdit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artworkId" INTEGER NOT NULL,
    "editorEmail" TEXT NOT NULL,
    "beforeJson" TEXT NOT NULL,
    "afterJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkEdit_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`)
  await db.execute('CREATE INDEX IF NOT EXISTS "ArtworkEdit_artworkId_createdAt_idx" ON "ArtworkEdit"("artworkId", "createdAt")')
  console.log('Loan and ArtworkEdit tables/indexes ready in Turso')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
