/**
 * Full sync of one artist's Artist + Museum + Artwork rows from dev.db to
 * Turso. Existing Artwork rows are matched by catalogue_id (never by id,
 * which can differ between the two databases) and updated in place; rows
 * without a remote match are inserted. Never touches User/Account/Session/
 * Seen/Report, and never deletes anything.
 *
 * Gebruik:
 *   node scripts/sync-artist-to-turso.mjs "Wassily Kandinsky"
 *   node scripts/sync-artist-to-turso.mjs "Johannes Vermeer"
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const artistName = process.argv[2]
if (!artistName) {
  console.error('Gebruik: node scripts/sync-artist-to-turso.mjs "<artiestnaam>"')
  process.exit(1)
}

const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=')
  let v = l.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  return [l.slice(0, i), v]
}))
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')

const local = new Database(resolve(__dirname, '../dev.db'), { readonly: true })
const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

function chunks(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function applyMigrationIfMissing(migrationName, columnAdditions) {
  const columns = await turso.execute(`PRAGMA table_info('Artwork')`)
  const existing = new Set(columns.rows.map(r => r.name))
  for (const [name, type] of columnAdditions) {
    if (!existing.has(name)) await turso.execute(`ALTER TABLE Artwork ADD COLUMN ${name} ${type}`)
  }
  const known = await turso.execute({ sql: 'SELECT 1 FROM _prisma_migrations WHERE migration_name=? LIMIT 1', args: [migrationName] })
  if (!known.rows.length) {
    const migrationPath = resolve(__dirname, `../prisma/migrations/${migrationName}/migration.sql`)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    const { createHash, randomUUID } = await import('crypto')
    const now = new Date().toISOString()
    await turso.execute({
      sql: 'INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, 1)',
      args: [randomUUID(), createHash('sha256').update(sql).digest('hex'), migrationName, now, now],
    })
  }
}

async function ensureSchema() {
  // Session 10 added these to dev.db but a prior session never synced them
  // to Turso -- caught here rather than assumed, since ALTER TABLE ADD
  // COLUMN is itself idempotent-safe to re-check every run.
  await applyMigrationIfMissing('20260912190000_add_image_provenance', [
    ['image_source_url', 'TEXT'], ['image_source_name', 'TEXT'],
    ['image_rights', 'TEXT'], ['image_retrieved_at', 'DATETIME'],
  ])
  await applyMigrationIfMissing('20260912220000_add_attribution_status', [
    ['attribution_status', "TEXT DEFAULT 'accepted'"], ['attribution_note', 'TEXT'],
  ])
}

async function main() {
  await ensureSchema()

  const localArtist = local.prepare('SELECT * FROM Artist WHERE name = ?').get(artistName)
  if (!localArtist) throw new Error(`${artistName} not found locally`)

  let remoteArtistResult = await turso.execute({ sql: 'SELECT id FROM Artist WHERE slug = ?', args: [localArtist.slug] })
  let remoteArtistId
  if (remoteArtistResult.rows.length) {
    remoteArtistId = Number(remoteArtistResult.rows[0].id)
    console.log(`Artist already exists remotely: id ${remoteArtistId}`)
  } else {
    const idRow = await turso.execute('SELECT COALESCE(MAX(id), 0) + 1 next_id FROM Artist')
    remoteArtistId = Number(idRow.rows[0].next_id)
    await turso.execute({
      sql: 'INSERT INTO Artist (id, name, slug, birth_year, death_year, nationality, nationality_en, bio, bio_en, portrait_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [remoteArtistId, localArtist.name, localArtist.slug, localArtist.birth_year, localArtist.death_year,
             localArtist.nationality, localArtist.nationality_en, localArtist.bio, localArtist.bio_en, localArtist.portrait_url],
    })
    console.log(`Inserted Artist remotely: id ${remoteArtistId}`)
  }

  const rows = local.prepare(`
    SELECT w.*, m.name museum_name, m.city museum_city, m.country museum_country, m.lat museum_lat, m.lng museum_lng
    FROM Artwork w LEFT JOIN Museum m ON m.id = w.museumId
    WHERE w.artistId = ?
    ORDER BY w.id
  `).all(localArtist.id)
  console.log(`Read ${rows.length} local Artwork rows for "${artistName}"`)

  const museumResult = await turso.execute('SELECT id, name, city FROM Museum')
  const museumByKey = new Map(museumResult.rows.map(r => [`${String(r.name).toLowerCase()}|${String(r.city).toLowerCase()}`, Number(r.id)]))
  const museumIdRow = await turso.execute('SELECT COALESCE(MAX(id), 0) next_id FROM Museum')
  let nextMuseumId = Number(museumIdRow.rows[0].next_id)
  const museumStatements = []
  for (const row of rows) {
    if (!row.museum_name) continue
    const key = `${row.museum_name.toLowerCase()}|${(row.museum_city || '').toLowerCase()}`
    if (!museumByKey.has(key)) {
      nextMuseumId += 1
      museumByKey.set(key, nextMuseumId)
      museumStatements.push({
        sql: 'INSERT INTO Museum (id, name, city, country, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
        args: [nextMuseumId, row.museum_name, row.museum_city || '', row.museum_country || 'Unknown', row.museum_lat ?? null, row.museum_lng ?? null],
      })
    }
  }

  const remoteArtworkResult = await turso.execute({ sql: 'SELECT id, catalogue_id FROM Artwork WHERE artistId = ?', args: [remoteArtistId] })
  const byCatalogue = new Map()
  const remoteIdsForArtist = new Set()
  for (const r of remoteArtworkResult.rows) {
    remoteIdsForArtist.add(Number(r.id))
    if (r.catalogue_id) byCatalogue.set(String(r.catalogue_id), Number(r.id))
  }
  const allIdsResult = await turso.execute('SELECT id FROM Artwork')
  const usedIds = new Set(allIdsResult.rows.map(r => Number(r.id)))
  let maxId = Math.max(0, ...usedIds)

  const FIELDS = [
    'museumId', 'title', 'year_start', 'year_end', 'medium_raw', 'type_normalized',
    'dimensions_raw', 'image_url', 'image_local_path', 'image_source_url', 'image_source_name',
    'image_rights', 'image_retrieved_at', 'source_url', 'source_name', 'catalogue_id',
    'jh_catalogue_id', 'alternate_titles', 'location_confidence', 'location_verified_at',
    'attribution_status', 'attribution_note',
  ]

  let updated = 0, inserted = 0
  const statements = []
  for (const row of rows) {
    const museumId = row.museum_name ? museumByKey.get(`${row.museum_name.toLowerCase()}|${(row.museum_city || '').toLowerCase()}`) ?? null : null
    const values = [
      museumId, row.title, row.year_start, row.year_end, row.medium_raw, row.type_normalized,
      row.dimensions_raw, row.image_url, row.image_local_path, row.image_source_url, row.image_source_name,
      row.image_rights, row.image_retrieved_at, row.source_url, row.source_name, row.catalogue_id,
      row.jh_catalogue_id, row.alternate_titles, row.location_confidence, row.location_verified_at,
      row.attribution_status, row.attribution_note,
    ]
    // Prefer catalogue_id (stable across ids); fall back to "same id already
    // belongs to this artist remotely" for rows that predate catalogue_id
    // and were originally seeded with matching ids in both databases. Never
    // treat a bare id match against another artist's row as a hit.
    const existingId = (row.catalogue_id && byCatalogue.get(row.catalogue_id))
      ?? (remoteIdsForArtist.has(Number(row.id)) ? Number(row.id) : undefined)
    if (existingId) {
      statements.push({
        sql: `UPDATE Artwork SET artistId=?, ${FIELDS.map(f => `${f}=?`).join(', ')} WHERE id=?`,
        args: [remoteArtistId, ...values, existingId],
      })
      updated += 1
    } else {
      let targetId = Number(row.id)
      if (usedIds.has(targetId)) targetId = ++maxId
      usedIds.add(targetId)
      maxId = Math.max(maxId, targetId)
      statements.push({
        sql: `INSERT INTO Artwork (id, artistId, ${FIELDS.join(', ')}) VALUES (?, ?, ${FIELDS.map(() => '?').join(', ')})`,
        args: [targetId, remoteArtistId, ...values],
      })
      inserted += 1
    }
  }

  console.log({ museumsToCreate: museumStatements.length, updated, inserted })
  if (museumStatements.length) await turso.batch(museumStatements, 'write')
  let completed = 0
  for (const batch of chunks(statements, 100)) {
    await turso.batch(batch, 'write')
    completed += batch.length
    console.log(`  ${completed}/${statements.length}`)
  }

  const stats = await turso.execute({
    sql: `SELECT COUNT(*) total,
      SUM(CASE WHEN image_url IS NOT NULL OR image_local_path IS NOT NULL THEN 1 ELSE 0 END) with_image,
      SUM(CASE WHEN attribution_status='disputed' THEN 1 ELSE 0 END) disputed
      FROM Artwork WHERE artistId=?`,
    args: [remoteArtistId],
  })
  console.log(`Turso ${artistName}:`, stats.rows[0])
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => {
  local.close()
  turso.close()
})
