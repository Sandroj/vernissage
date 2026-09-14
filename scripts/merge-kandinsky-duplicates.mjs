/**
 * Merge the audited, high-confidence duplicate Kandinsky rows into their
 * institutional/Wikidata row. The default mode is read-only.
 *
 * Usage:
 *   node scripts/merge-kandinsky-duplicates.mjs
 *   node scripts/merge-kandinsky-duplicates.mjs --apply
 *
 * The script checks both dev.db and Turso. Seen rows are preserved; when a
 * user has already seen both rows, the older duplicate Seen row is removed to
 * satisfy the unique (userId, artworkId) constraint. Reports are reassigned.
 */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(scriptDir, '..')
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync(resolve(appDir, '.env.local'), 'utf8')
  .split('\n')
  .filter((line) => line.includes('='))
  .map((line) => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
  }))

const merges = [
  [5482, 325], [5442, 307], [5302, 12], [5490, 2], [5518, 115],
  [5311, 22], [5314, 188], [5463, 124], [5495, 229], [5453, 402],
  [5304, 129], [5503, 404], [5526, 508], [5532, 24], [5305, 28],
  [5298, 137], [5448, 426], [5423, 95], [5284, 351], [5394, 194],
  [5514, 592], [5320, 244], [5318, 187], [5390, 280], [5333, 199],
  [5431, 161], [5299, 55], [5414, 487], [5291, 241], [5417, 270],
]

const targets = [
  { name: 'local dev.db', client: createClient({ url: `file:${resolve(appDir, 'dev.db')}` }) },
  { name: 'Turso production', client: createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }) },
]

const columns = [
  'id', 'artistId', 'museumId', 'title', 'year_start', 'year_end', 'medium_raw',
  'type_normalized', 'dimensions_raw', 'image_url', 'image_local_path',
  'image_source_url', 'image_source_name', 'image_rights', 'image_retrieved_at',
  'source_url', 'source_name', 'catalogue_id', 'jh_catalogue_id', 'alternate_titles',
  'location_confidence', 'location_verified_at', 'attribution_status',
  'attribution_note', 'attribution_note_en',
]

async function getRows(client, sql, args = []) {
  const result = await client.execute({ sql, args })
  return result.rows.map((row) => Object.fromEntries(Object.entries(row)))
}

async function snapshot(client, artistId, ids) {
  const placeholders = ids.map(() => '?').join(',')
  return {
    artwork: await getRows(client, `SELECT ${columns.join(',')} FROM Artwork WHERE artistId=? AND id IN (${placeholders})`, [artistId, ...ids]),
    seen: await getRows(client, `SELECT * FROM Seen WHERE artworkId IN (${placeholders})`, ids),
    reports: await getRows(client, `SELECT * FROM Report WHERE artworkId IN (${placeholders})`, ids),
  }
}

for (const target of targets) {
  const { client } = target
  const artistRows = await getRows(client, 'SELECT id FROM Artist WHERE name=?', ['Wassily Kandinsky'])
  if (artistRows.length !== 1) throw new Error(`${target.name}: Kandinsky not uniquely found`)
  const artistId = Number(artistRows[0].id)
  const ids = merges.flat()
  const rows = await getRows(client, `SELECT id,title,catalogue_id,museumId FROM Artwork WHERE artistId=? AND id IN (${ids.map(() => '?').join(',')})`, [artistId, ...ids])
  const byId = new Map(rows.map((row) => [Number(row.id), row]))
  const missingKeeps = merges.filter(([keep]) => !byId.has(keep)).map(([keep]) => keep)
  if (missingKeeps.length) throw new Error(`${target.name}: missing keep rows ${missingKeeps.join(', ')}`)

  console.log(`\n${target.name}: ${rows.length}/${ids.length} audited rows present`)
  for (const [keep, duplicate] of merges) {
    const old = byId.get(duplicate)
    if (!old) {
      console.log(`  already merged: ${duplicate} -> ${keep}`)
      continue
    }
    const relations = await getRows(client, `SELECT
      (SELECT COUNT(*) FROM Seen WHERE artworkId=?) AS seen,
      (SELECT COUNT(*) FROM Report WHERE artworkId=?) AS reports`, [duplicate, duplicate])
    console.log(`  ${duplicate} "${old.title}" -> ${keep} "${byId.get(keep).title}" (Seen ${relations[0].seen}, Report ${relations[0].reports})`)
  }

  if (!apply) continue

  const backupPath = `/tmp/kandinsky-duplicate-backup-${target.name === 'local dev.db' ? 'dev' : 'turso'}-${Date.now()}.json`
  fs.writeFileSync(backupPath, JSON.stringify(await snapshot(client, artistId, ids), null, 2))
  console.log(`  backup: ${backupPath}`)

  for (const [keep, duplicate] of merges) {
    if (!byId.has(duplicate)) continue
    await client.batch([
      // Avoid violating Seen's unique user/artwork constraint when both rows
      // were marked seen by the same user.
      { sql: 'DELETE FROM Seen WHERE artworkId=? AND userId IN (SELECT userId FROM Seen WHERE artworkId=?)', args: [duplicate, keep] },
      { sql: 'UPDATE Seen SET artworkId=? WHERE artworkId=?', args: [keep, duplicate] },
      { sql: 'UPDATE Report SET artworkId=? WHERE artworkId=?', args: [keep, duplicate] },
      // Preserve a better legacy image only when the canonical row is empty.
      { sql: `UPDATE Artwork SET
        image_url=COALESCE(image_url,(SELECT image_url FROM Artwork WHERE id=?)),
        image_local_path=COALESCE(image_local_path,(SELECT image_local_path FROM Artwork WHERE id=?)),
        image_source_url=COALESCE(image_source_url,(SELECT image_source_url FROM Artwork WHERE id=?)),
        image_source_name=COALESCE(image_source_name,(SELECT image_source_name FROM Artwork WHERE id=?)),
        image_rights=COALESCE(image_rights,(SELECT image_rights FROM Artwork WHERE id=?)),
        image_retrieved_at=COALESCE(image_retrieved_at,(SELECT image_retrieved_at FROM Artwork WHERE id=?))
        WHERE id=?`, args: [duplicate, duplicate, duplicate, duplicate, duplicate, duplicate, keep] },
      { sql: 'DELETE FROM Artwork WHERE id=? AND artistId=?', args: [duplicate, artistId] },
    ], 'write')
  }
  console.log('  applied')
}

console.log(apply ? '\nKandinsky duplicate merges applied to dev.db and Turso.' : '\nDry run only; pass --apply to change both databases.')
