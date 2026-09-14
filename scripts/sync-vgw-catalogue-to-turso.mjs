/**
 * Synchronise the complete local Van Gogh Worldwide F catalogue to Turso.
 *
 * Existing rows are updated by catalogue_id so their ids and user relations
 * stay intact. Missing canonical rows are inserted. Legacy Van Gogh rows
 * without catalogue_id are retained for audit, never deleted.
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

function normalizeArtworkTitle(title) {
  return title
    .replace(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*(?=\()/g, ' ')
    .replace(/\s*\(\s*No\./g, ' (No.')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const dryRun = process.argv.includes('--dry-run')

const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(line => line.includes('=')).map(line => {
  const index = line.indexOf('=')
  let value = line.slice(index + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
  return [line.slice(0, index), value]
}))
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')

const local = new Database(resolve(__dirname, '../dev.db'), { readonly: true })
const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

async function main() {
  const localArtist = local.prepare("SELECT id FROM Artist WHERE name='Vincent van Gogh'").get()
  if (!localArtist) throw new Error('Vincent van Gogh missing locally')
  const rows = local.prepare(`
    SELECT w.*, m.name museum_name, m.city museum_city, m.country museum_country
    FROM Artwork w LEFT JOIN Museum m ON m.id=w.museumId
    WHERE w.artistId=? AND w.catalogue_id IS NOT NULL
    ORDER BY w.id
  `).all(localArtist.id)
  if (rows.length !== 2135) throw new Error(`Expected 2135 local F records, found ${rows.length}`)
  if (new Set(rows.map(row => row.catalogue_id)).size !== rows.length) throw new Error('Duplicate local F numbers')

  const remoteArtistResult = await turso.execute("SELECT id FROM Artist WHERE name='Vincent van Gogh' LIMIT 1")
  if (!remoteArtistResult.rows.length) throw new Error('Vincent van Gogh missing in Turso')
  const remoteArtistId = Number(remoteArtistResult.rows[0].id)
  const remoteArtworkResult = await turso.execute({
    sql: 'SELECT * FROM Artwork WHERE artistId=? ORDER BY id',
    args: [remoteArtistId],
  })
  const backupPath = `/tmp/turso-vangogh-before-primary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  fs.writeFileSync(backupPath, JSON.stringify(remoteArtworkResult.rows, null, 2))

  const byCatalogue = new Map()
  const usedIds = new Set()
  let maxId = 0
  const allIds = await turso.execute('SELECT id FROM Artwork')
  for (const row of allIds.rows) {
    const id = Number(row.id)
    usedIds.add(id)
    maxId = Math.max(maxId, id)
  }
  for (const row of remoteArtworkResult.rows) {
    if (row.catalogue_id) byCatalogue.set(String(row.catalogue_id), Number(row.id))
  }

  const museumResult = await turso.execute('SELECT id, name FROM Museum ORDER BY id')
  const museumByName = new Map(museumResult.rows.map(row => [String(row.name).toLocaleLowerCase(), Number(row.id)]))
  const museumStatements = []
  const missingMuseums = new Map()
  for (const row of rows) {
    if (!row.museum_name) continue
    const key = row.museum_name.toLocaleLowerCase()
    if (!museumByName.has(key)) missingMuseums.set(key, row)
  }
  for (const [key, row] of missingMuseums) {
    const museumIdResult = await turso.execute('SELECT COALESCE(MAX(id), 0) + 1 next_id FROM Museum')
    const museumId = Number(museumIdResult.rows[0].next_id) + museumStatements.length
    museumByName.set(key, museumId)
    museumStatements.push({
      sql: 'INSERT INTO Museum(id, name, city, country) VALUES (?, ?, ?, ?)',
      args: [museumId, row.museum_name, row.museum_city || '', row.museum_country || 'Unknown'],
    })
  }

  let inserted = 0
  let updated = 0
  const statements = []
  for (const row of rows) {
    const museumId = row.museum_name ? museumByName.get(row.museum_name.toLocaleLowerCase()) ?? null : null
    const values = [
      remoteArtistId, museumId, normalizeArtworkTitle(row.title), row.year_start, row.year_end, row.medium_raw,
      row.type_normalized, row.dimensions_raw, row.image_url, row.image_local_path,
      row.source_url, row.source_name, row.catalogue_id, row.jh_catalogue_id,
      row.alternate_titles, row.location_confidence, row.location_verified_at,
    ]
    const existingId = byCatalogue.get(row.catalogue_id)
    if (existingId) {
      statements.push({
        sql: `UPDATE Artwork SET artistId=?, museumId=?, title=?, year_start=?, year_end=?, medium_raw=?,
          type_normalized=?, dimensions_raw=?, image_url=?, image_local_path=?, source_url=?, source_name=?,
          catalogue_id=?, jh_catalogue_id=?, alternate_titles=?, location_confidence=?, location_verified_at=?
          WHERE id=?`,
        args: [...values, existingId],
      })
      updated += 1
    } else {
      let targetId = Number(row.id)
      if (usedIds.has(targetId)) targetId = ++maxId
      usedIds.add(targetId)
      maxId = Math.max(maxId, targetId)
      statements.push({
        sql: `INSERT INTO Artwork(id, artistId, museumId, title, year_start, year_end, medium_raw,
          type_normalized, dimensions_raw, image_url, image_local_path, source_url, source_name,
          catalogue_id, jh_catalogue_id, alternate_titles, location_confidence, location_verified_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [targetId, ...values],
      })
      inserted += 1
    }
  }

  console.log({ dryRun, backupPath, canonical: rows.length, updated, inserted, museumsToCreate: museumStatements.length })
  if (dryRun) return
  if (museumStatements.length) await turso.batch(museumStatements, 'write')
  let completed = 0
  for (const batch of chunks(statements, 100)) {
    await turso.batch(batch, 'write')
    completed += batch.length
    console.log(`  ${completed}/${statements.length}`)
  }

  const stats = await turso.execute({
    sql: `SELECT COUNT(*) total, COUNT(catalogue_id) canonical,
      SUM(CASE WHEN catalogue_id IS NULL THEN 1 ELSE 0 END) legacy,
      SUM(CASE WHEN catalogue_id IS NOT NULL AND (type_normalized='painting' OR type_normalized LIKE 'painting|%') THEN 1 ELSE 0 END) paintings,
      SUM(CASE WHEN catalogue_id IS NOT NULL AND (image_url IS NOT NULL OR image_local_path IS NOT NULL) THEN 1 ELSE 0 END) with_image
      FROM Artwork WHERE artistId=?`,
    args: [remoteArtistId],
  })
  console.log('Turso Van Gogh:', stats.rows[0])
  if (Number(stats.rows[0].canonical) !== 2135) throw new Error('Canonical Turso count is not 2135')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  local.close()
  turso.close()
})
