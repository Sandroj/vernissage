/** One-off: reconcile Singer Laren's "Herman Kruyder. Expressionist van de ziel" exhibition
 * (23 sep 2026 - 14 feb 2027) against the live Kruyder catalogue.
 * Source: https://www.singerlaren.nl/nl/agenda/herman-kruyder-expressionist-van-de-ziel-5t3s
 *         https://mailchi.mp/singerlaren.nl/persbericht-herman-kruyder-13369836
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
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

const EXHIBITION_URL = 'https://www.singerlaren.nl/nl/agenda/herman-kruyder-expressionist-van-de-ziel-5t3s'
const START_AT = '2026-09-23'
const END_AT = '2027-02-14'

async function scalar(sql, args = []) {
  const result = await db.execute({ sql, args })
  return result.rows[0]
}

async function main() {
  const artist = await scalar(`SELECT id FROM Artist WHERE name LIKE '%Kruyder%'`)
  if (!artist) throw new Error('Kruyder not found on Turso')
  const artistId = artist.id

  const singer = await scalar(`SELECT id, name FROM Museum WHERE name = 'Singer Laren'`)
  if (!singer) throw new Error('Singer Laren not found on Turso')
  const SINGER_LAREN_ID = singer.id

  // 1. New work found only via the exhibition press release, confirmed against
  //    Boijmans' own collection page and RKDimages (RKD-276302).
  const existingMeisje = await scalar(
    `SELECT id FROM Artwork WHERE artistId = ? AND title = 'Meisje met maan'`, [artistId]
  )
  let meisjeId = existingMeisje?.id
  if (!meisjeId) {
    const boijmans = await scalar(`SELECT id FROM Museum WHERE name = 'Museum Boijmans Van Beuningen'`)
    if (!boijmans) throw new Error('Museum Boijmans Van Beuningen not found on Turso')
    const inserted = await db.execute({
      sql: `INSERT INTO Artwork (artistId, museumId, title, year_start, medium_raw, dimensions_raw, catalogue_id, source_url, source_name)
            VALUES (?, ?, 'Meisje met maan', 1928, 'Gouache op karton', '68 x 50 cm', 'RKD-276302', ?, ?)`,
      args: [
        artistId, boijmans.id,
        'https://www.boijmans.nl/collectie/kunstwerken/165985/meisje-met-maan',
        'Museum Boijmans Van Beuningen',
      ],
    })
    meisjeId = Number(inserted.lastInsertRowid)
    console.log(`Inserted 'Meisje met maan' as Artwork #${meisjeId}`)
  } else {
    console.log(`'Meisje met maan' already exists as Artwork #${meisjeId}, skipping insert`)
  }

  // 2. Het kalf is known to sit in a private collection (Collectie Regnault), not a museum.
  //    Record that as the permanent state, independent of the current loan below.
  const kalf = await scalar(`SELECT id, private_owner_name FROM Artwork WHERE artistId = ? AND title = 'Het kalf'`, [artistId])
  if (!kalf) throw new Error("'Het kalf' not found on Turso")
  if (kalf.private_owner_name !== 'Collectie Regnault') {
    await db.execute({ sql: `UPDATE Artwork SET private_owner_name = 'Collectie Regnault' WHERE id = ?`, args: [kalf.id] })
    console.log(`Set private_owner_name='Collectie Regnault' on Artwork #${kalf.id} (Het kalf)`)
  }

  // 3. Loan candidates: title -> permanent museum name (null = private owner already set above).
  const loanTitles = [
    'De varkensdoder',
    'De hond',
    'De hengst',
    'Zelfportret met penseel',
    'Het melkmeisje',
    'Meisje met maan',
    'Het kalf',
  ]

  for (const title of loanTitles) {
    const artwork = await scalar(
      `SELECT id, museumId, private_owner_name FROM Artwork WHERE artistId = ? AND title = ?`,
      [artistId, title]
    )
    if (!artwork) { console.warn(`Skipped '${title}': not found`); continue }

    const already = await scalar(
      `SELECT id FROM Loan WHERE artworkId = ? AND toMuseumId = ? AND current = 1`,
      [artwork.id, SINGER_LAREN_ID]
    )
    if (already) { console.log(`Loan already present for '${title}' (Artwork #${artwork.id}), skipping`); continue }

    await db.execute({
      sql: `INSERT INTO Loan (artworkId, fromMuseumId, fromOwnerName, toMuseumId, startAt, endAt, current, sourceUrl, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      args: [
        artwork.id,
        artwork.museumId ?? null,
        artwork.private_owner_name ?? null,
        SINGER_LAREN_ID,
        START_AT,
        END_AT,
        EXHIBITION_URL,
      ],
    })
    console.log(`Loan created for '${title}' (Artwork #${artwork.id}) -> Singer Laren`)
  }

  console.log('Done.')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
