/** Apply the German-title and public-feedback schema additions to Turso. */
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
  const columns = await db.execute('PRAGMA table_info(Artwork)')
  if (!columns.rows.some(row => row.name === 'title_de')) {
    await db.execute('ALTER TABLE Artwork ADD COLUMN title_de TEXT')
    console.log('added Artwork.title_de')
  } else {
    console.log('exists Artwork.title_de')
  }

  await db.execute(`CREATE TABLE IF NOT EXISTS "WorkSuggestion" (
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
  )`)
  await db.execute('CREATE INDEX IF NOT EXISTS "WorkSuggestion_artworkId_idx" ON "WorkSuggestion"("artworkId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "WorkSuggestion_status_idx" ON "WorkSuggestion"("status")')
  console.log('WorkSuggestion table and indexes ready')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => db.close())
