/** Second pass on the Singer Laren Kruyder reconciliation: the exhibition's
 * image carousel (7 slides, not visible to a plain text-fetch of the page)
 * revealed two things the first pass missed:
 *  - "De gele hond" is on loan from the Gemeente Blaricum, not identified before.
 *  - "Portret van Jo Bouman" (RKD-242457) was bought by Singer Laren in 2022 —
 *    a genuinely new work in our catalogue, and *owned*, not on loan.
 * Source: https://www.singerlaren.nl/nl/agenda/herman-kruyder-expressionist-van-de-ziel-5t3s
 */
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
if (!env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL missing from .env.local')
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

const EXHIBITION_URL = 'https://www.singerlaren.nl/nl/agenda/herman-kruyder-expressionist-van-de-ziel-5t3s'
const START_AT = '2026-09-23'
const END_AT = '2027-02-14'

async function scalar(sql, args = []) {
  return (await db.execute({ sql, args })).rows[0]
}

async function main() {
  const artistId = (await scalar(`SELECT id FROM Artist WHERE name LIKE '%Kruyder%'`)).id
  const singer = await scalar(`SELECT id FROM Museum WHERE name = 'Singer Laren'`)
  if (!singer) throw new Error('Singer Laren not found on Turso')

  // 1. De gele hond: on loan from Gemeente Blaricum (private/municipal owner,
  //    not a museum), previously reconciled with no owner or loan at all.
  const geleHond = await scalar(`SELECT id FROM Artwork WHERE artistId = ? AND title = 'De gele hond'`, [artistId])
  if (!geleHond) throw new Error("'De gele hond' not found")
  await db.execute({
    sql: `UPDATE Artwork SET private_owner_name = 'Gemeente Blaricum', dimensions_raw = COALESCE(dimensions_raw, '43 x 57 cm') WHERE id = ?`,
    args: [geleHond.id],
  })
  const existingLoan = await scalar(`SELECT id FROM Loan WHERE artworkId = ? AND toMuseumId = ? AND current = 1`, [geleHond.id, singer.id])
  if (!existingLoan) {
    await db.execute({
      sql: `INSERT INTO Loan (artworkId, fromMuseumId, fromOwnerName, toMuseumId, startAt, endAt, current, sourceUrl, createdAt)
            VALUES (?, NULL, 'Gemeente Blaricum', ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      args: [geleHond.id, singer.id, START_AT, END_AT, EXHIBITION_URL],
    })
    console.log(`Set owner + created Loan for 'De gele hond' (#${geleHond.id})`)
  } else {
    console.log(`'De gele hond' already had a current Loan to Singer Laren`)
  }

  // 2. Portret van Jo Bouman: new work, bought by Singer Laren in 2022 — owned,
  //    not on loan. Confirmed against RKDimages (RKD-242457 / digital object
  //    10639215) by comparing images, since none of the app's existing
  //    Jo-Kruyder-Bouman-titled portraits matched the exhibition photo.
  const existing = await scalar(`SELECT id FROM Artwork WHERE artistId = ? AND title = 'Portret van Jo Bouman'`, [artistId])
  if (existing) {
    console.log(`'Portret van Jo Bouman' already exists as Artwork #${existing.id}, skipping insert`)
  } else {
    const imageUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/artworks/kruyder-RKD-242457.jpg`
    const inserted = await db.execute({
      sql: `INSERT INTO Artwork (
              artistId, museumId, title, alternate_titles, year_start, medium_raw, dimensions_raw,
              catalogue_id, source_url, source_name,
              image_url, image_source_url, image_source_name, image_rights, image_retrieved_at
            ) VALUES (?, ?, 'Portret van Jo Bouman', 'Portret van Jo Kruyder Bouman', 1913, 'oil paint, olieverf, canvas, doek', '32.5 x 24.5 cm',
              'RKD-242457', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        artistId, singer.id,
        'https://data.rkd.nl/images/242457',
        'RKDimages (RKD - Nederlands Instituut voor Kunstgeschiedenis)',
        imageUrl,
        'https://data.rkd.nl/images/242457',
        'RKDimages (RKD - Nederlands Instituut voor Kunstgeschiedenis)',
        'CC0 (RKD digital-object rechten-triple, publiek domein)',
        '2026-09-22',
      ],
    })
    console.log(`Inserted 'Portret van Jo Bouman' as Artwork #${Number(inserted.lastInsertRowid)} (owned by Singer Laren, aankoop 2022 — no Loan)`)
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
