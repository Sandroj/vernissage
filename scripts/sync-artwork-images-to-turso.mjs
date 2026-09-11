/**
 * Sync Artwork-velden van lokale dev.db naar Turso, per artiest. Overschrijft
 * ALLEEN de opgegeven velden, per bestaand id — nooit de hele tabel. Raakt
 * User/Account/Session/Seen/Report niet aan.
 *
 * Gebruik:
 *   node scripts/sync-artwork-images-to-turso.mjs "Vincent van Gogh"
 *     → standaard: image_local_path + image_url
 *   node scripts/sync-artwork-images-to-turso.mjs "Vincent van Gogh" type_normalized medium_raw
 *     → alleen de genoemde velden
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
  console.error('Gebruik: node scripts/sync-artwork-images-to-turso.mjs "<artiestnaam>" [veld ...]')
  process.exit(1)
}
const ALLOWED_FIELDS = ['image_local_path', 'image_url', 'type_normalized', 'medium_raw']
const fields = process.argv.length > 3 ? process.argv.slice(3) : ['image_local_path', 'image_url']
const bad = fields.filter(f => !ALLOWED_FIELDS.includes(f))
if (bad.length) {
  console.error(`Onbekend veld: ${bad.join(', ')}. Toegestaan: ${ALLOWED_FIELDS.join(', ')}`)
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
  const cols = fields.map(f => `w.${f}`).join(', ')
  const rows = db.prepare(`
    SELECT w.id, ${cols}
    FROM Artwork w JOIN Artist a ON a.id = w.artistId
    WHERE a.name = ?
  `).all(artistName)
  console.log(`Read ${rows.length} rows for "${artistName}" from dev.db — fields: ${fields.join(', ')}`)
  if (rows.length === 0) process.exit(0)

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const BATCH = 50
  let updated = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await turso.batch(
      batch.map(r => ({
        sql: `UPDATE Artwork SET ${setClause} WHERE id = ?`,
        args: [...fields.map(f => r[f]), r.id],
      })),
      'write'
    )
    updated += batch.length
    if (updated % 500 === 0) console.log(`  updated ${updated}/${rows.length}`)
  }
  console.log(`Updated ${fields.join(', ')} on ${updated} Turso rows`)

  const stats = await turso.execute({
    sql: `SELECT ${fields[0]} as value, COUNT(*) as n
          FROM Artwork w JOIN Artist a ON a.id = w.artistId WHERE a.name = ?
          GROUP BY ${fields[0]} ORDER BY n DESC LIMIT 8`,
    args: [artistName],
  })
  console.log(`Turso now (${fields[0]}):`, stats.rows.map(r => `${r.value ?? 'NULL'}=${r.n}`).join(', '))

  turso.close()
  db.close()
}

main().catch(e => { console.error(e); process.exit(1) })
