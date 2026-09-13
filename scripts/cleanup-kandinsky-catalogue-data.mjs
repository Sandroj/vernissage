/**
 * Removes three demonstrable non-artworks imported from Wikidata and three
 * malformed/historic Kandinsky holder rows. Targets textual stable keys, not
 * database ids. Refuses to remove non-artworks with user data attached.
 *
 * Usage: node scripts/cleanup-kandinsky-catalogue-data.mjs [--apply]
 * Without --apply this is a dry run against local dev.db and Turso.
 */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(scriptDir, '..')
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync(resolve(appDir, '.env.local'), 'utf8').split('\n').filter(line => line.includes('=')).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
}))

const targets = [
  { name: 'local dev.db', client: createClient({ url: `file:${resolve(appDir, 'dev.db')}` }) },
  { name: 'Turso production', client: createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }) },
]
const nonArtworkIds = ['WD-Q55256833', 'WD-Q131766581', 'WD-Q104975856']
const bogusMuseums = [
  ['gouache and crayon on paper', 'Watercolor'],
  ['gouache', 'Watercolor'],
  ['Netherlands. Van Abbemuseum', 'Eindhoven'],
]

for (const target of targets) {
  const artist = await target.client.execute({ sql: 'SELECT id FROM Artist WHERE name=?', args: ['Wassily Kandinsky'] })
  if (artist.rows.length !== 1) throw new Error(`${target.name}: Kandinsky not uniquely found`)
  const artistId = artist.rows[0].id
  console.log(`\n${target.name}:`)

  for (const catalogueId of nonArtworkIds) {
    const rows = await target.client.execute({
      sql: `SELECT a.id,a.title,
            (SELECT COUNT(*) FROM Seen WHERE artworkId=a.id) AS seen,
            (SELECT COUNT(*) FROM Report WHERE artworkId=a.id) AS reports
            FROM Artwork a WHERE a.artistId=? AND a.catalogue_id=?`,
      args: [artistId, catalogueId],
    })
    if (!rows.rows.length) {
      console.log(`  already absent: ${catalogueId}`)
      continue
    }
    const row = rows.rows[0]
    console.log(`  non-artwork ${catalogueId}: "${row.title}" (Seen ${row.seen}, Report ${row.reports})`)
    if (Number(row.seen) || Number(row.reports)) throw new Error(`${target.name}: refusing to delete ${catalogueId} with user data`)
    if (apply) await target.client.execute({ sql: 'DELETE FROM Artwork WHERE id=?', args: [row.id] })
  }

  for (const [name, city] of bogusMuseums) {
    const rows = await target.client.execute({
      sql: `SELECT m.id,m.name,m.city,COUNT(a.id) AS works
            FROM Museum m LEFT JOIN Artwork a ON a.museumId=m.id
            WHERE m.name=? AND m.city=? GROUP BY m.id,m.name,m.city`,
      args: [name, city],
    })
    for (const row of rows.rows) {
      console.log(`  invalid holder: "${row.city}, ${row.name}" (${row.works} linked work(s))`)
      if (apply) {
        await target.client.batch([
          { sql: 'UPDATE Artwork SET museumId=NULL, location_confidence=? WHERE museumId=?', args: ['unknown', row.id] },
          { sql: 'DELETE FROM Museum WHERE id=?', args: [row.id] },
        ], 'write')
      }
    }
  }
}

console.log(apply ? '\nCleanup applied.' : '\nDry run only; pass --apply to change both databases.')
