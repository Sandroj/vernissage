/**
 * Sync Artwork.image_local_path / image_url van lokale dev.db naar Turso,
 * per artiest. Overschrijft ALLEEN deze twee velden, per bestaand id — nooit
 * de hele tabel. Raakt User/Account/Session/Seen/Report niet aan.
 *
 * Gebruik:
 *   node scripts/sync-artwork-images-to-turso.mjs "Vincent van Gogh"
 *
 * Vereist TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env.local.
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const artistName = process.argv[2]
if (!artistName) {
  console.error('Gebruik: node scripts/sync-artwork-images-to-turso.mjs "<artiestnaam>"')
  process.exit(1)
}

const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    return [l.slice(0, i), v]
  })
)
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
  console.error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN ontbreken in .env.local')
  process.exit(1)
}

const db = new Database(resolve(__dirname, '../dev.db'), { readonly: true })
const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

async function main() {
  const rows = db.prepare(`
    SELECT w.id, w.image_local_path, w.image_url
    FROM Artwork w JOIN Artist a ON a.id = w.artistId
    WHERE a.name = ?
  `).all(artistName)
  console.log(`Read ${rows.length} rows for "${artistName}" from dev.db`)
  if (rows.length === 0) process.exit(0)

  const BATCH = 50
  let updated = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await turso.batch(
      batch.map(r => ({
        sql: 'UPDATE Artwork SET image_local_path = ?, image_url = ? WHERE id = ?',
        args: [r.image_local_path, r.image_url, r.id],
      })),
      'write'
    )
    updated += batch.length
    if (updated % 500 === 0) console.log(`  updated ${updated}/${rows.length}`)
  }
  console.log(`Updated image fields on ${updated} Turso rows`)

  const stats = await turso.execute({
    sql: `SELECT COUNT(*) as total, SUM(CASE WHEN image_local_path IS NOT NULL THEN 1 ELSE 0 END) as with_local
          FROM Artwork w JOIN Artist a ON a.id = w.artistId WHERE a.name = ?`,
    args: [artistName],
  })
  console.log('Turso now:', stats.rows[0])

  turso.close()
  db.close()
}

main().catch(e => { console.error(e); process.exit(1) })
