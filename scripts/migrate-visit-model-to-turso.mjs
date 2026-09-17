/** Apply the Visit table to the live Turso DB. */
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
  await db.execute(`CREATE TABLE IF NOT EXISTS "Visit" (
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
  )`)
  await db.execute('CREATE INDEX IF NOT EXISTS "Visit_userId_artworkId_idx" ON "Visit"("userId", "artworkId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Visit_artworkId_idx" ON "Visit"("artworkId")')
  console.log('Visit table applied to Turso.')
}

main()
