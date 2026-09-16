/**
 * Add the catalogue-search fields to Turso and sync only locally verified
 * Van Gogh Worldwide matches. User/Seen/Report rows are never touched.
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { createHash, randomUUID } from 'crypto'
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
    .replace(/,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
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
const migrationName = '20260912123000_add_jh_catalogue_id'
const migrationPath = resolve(__dirname, `../prisma/migrations/${migrationName}/migration.sql`)

async function ensureSchema() {
  const columns = await turso.execute(`PRAGMA table_info('Artwork')`)
  const existing = new Set(columns.rows.map(row => row.name))
  const additions = [
    ['catalogue_id', 'TEXT'],
    ['jh_catalogue_id', 'TEXT'],
    ['alternate_titles', 'TEXT'],
    ['location_confidence', 'TEXT'],
    ['location_verified_at', 'DATETIME'],
  ]
  for (const [name, type] of additions) {
    if (!existing.has(name)) await turso.execute(`ALTER TABLE Artwork ADD COLUMN ${name} ${type}`)
  }
  await turso.execute('CREATE UNIQUE INDEX IF NOT EXISTS Artwork_catalogue_id_key ON Artwork(catalogue_id)')
  await turso.execute('CREATE INDEX IF NOT EXISTS Artwork_title_idx ON Artwork(title)')
  await turso.execute('CREATE INDEX IF NOT EXISTS Artwork_jh_catalogue_id_idx ON Artwork(jh_catalogue_id)')

  try {
    const known = await turso.execute({ sql: 'SELECT 1 FROM _prisma_migrations WHERE migration_name=? LIMIT 1', args: [migrationName] })
    if (!known.rows.length) {
      const sql = fs.readFileSync(migrationPath, 'utf8')
      const now = new Date().toISOString()
      await turso.execute({
        sql: `INSERT INTO _prisma_migrations
          (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
        args: [randomUUID(), createHash('sha256').update(sql).digest('hex'), now, migrationName, now],
      })
    }
  } catch (error) {
    console.warn(`Migration history could not be updated: ${error.message}`)
  }
}

async function remoteMuseumId(museum) {
  if (!museum) return null
  const found = await turso.execute({
    sql: 'SELECT id FROM Museum WHERE lower(name)=lower(?) AND lower(city)=lower(?) LIMIT 1',
    args: [museum.name, museum.city],
  })
  if (found.rows.length) return Number(found.rows[0].id)
  await turso.execute({
    sql: 'INSERT INTO Museum(name, city, country, website, lat, lng) VALUES (?, ?, ?, NULL, NULL, NULL)',
    args: [museum.name, museum.city, museum.country],
  })
  const inserted = await turso.execute({
    sql: 'SELECT id FROM Museum WHERE lower(name)=lower(?) AND lower(city)=lower(?) ORDER BY id DESC LIMIT 1',
    args: [museum.name, museum.city],
  })
  return Number(inserted.rows[0].id)
}

async function main() {
  await ensureSchema()
  const rows = local.prepare(`
    SELECT w.id, w.title, w.catalogue_id, w.jh_catalogue_id, w.alternate_titles, w.medium_raw,
           w.dimensions_raw, w.source_url, w.source_name, w.location_confidence,
           w.location_verified_at, w.image_url, w.image_local_path,
           m.name museum_name, m.city museum_city, m.country museum_country
    FROM Artwork w LEFT JOIN Museum m ON m.id=w.museumId
    JOIN Artist a ON a.id=w.artistId
    WHERE a.name='Vincent van Gogh' AND w.catalogue_id IS NOT NULL
    ORDER BY w.id
  `).all()
  console.log(`Syncing ${rows.length} verified Van Gogh Worldwide matches`)
  const museumCache = new Map()
  let updated = 0
  for (const row of rows) {
    let museumId = null
    if (row.museum_name) {
      const key = `${row.museum_name}\u0000${row.museum_city}`
      if (!museumCache.has(key)) museumCache.set(key, await remoteMuseumId({ name: row.museum_name, city: row.museum_city, country: row.museum_country }))
      museumId = museumCache.get(key)
    }
    await turso.execute({
      sql: `UPDATE Artwork SET title=?, catalogue_id=?, jh_catalogue_id=?, alternate_titles=?, medium_raw=?,
        dimensions_raw=?, source_url=?, source_name=?, location_confidence=?,
        location_verified_at=?, museumId=?, image_url=?, image_local_path=? WHERE id=?`,
      args: [normalizeArtworkTitle(row.title), row.catalogue_id, row.jh_catalogue_id, row.alternate_titles, row.medium_raw, row.dimensions_raw,
        row.source_url, row.source_name, row.location_confidence, row.location_verified_at,
        museumId, row.image_url, row.image_local_path, row.id],
    })
    updated++
    if (updated % 100 === 0) console.log(`  ${updated}/${rows.length}`)
  }
  const stats = await turso.execute(`
    SELECT COUNT(*) total, COUNT(catalogue_id) catalogued, COUNT(jh_catalogue_id) with_jh,
      SUM(CASE WHEN museumId IS NOT NULL THEN 1 ELSE 0 END) located,
      SUM(CASE WHEN image_url IS NOT NULL OR image_local_path IS NOT NULL THEN 1 ELSE 0 END) with_image
    FROM Artwork w JOIN Artist a ON a.id=w.artistId WHERE a.name='Vincent van Gogh'
  `)
  console.log('Turso Van Gogh:', stats.rows[0])
  local.close()
  turso.close()
}

main().catch(error => { console.error(error); process.exit(1) })
