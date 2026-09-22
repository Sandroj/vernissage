/** Fix a title-match mistake from the Singer Laren Kruyder reconciliation
 * (add-kruyder-singerlaren-exhibition.mjs): the exhibition's colour painting
 * captioned "Het kalf, 1932, olieverf op doek, Singer Laren, bruikleen
 * Collectie Regnault" is Vernissage's "Het stierkalf" (RKD-241864), not its
 * "Het kalf" (RKD-285075, a separate monochrome/grisaille painting, confirmed
 * by comparing both R2 images). Undo the wrong Loan/owner on "Het kalf" and
 * apply it to "Het stierkalf" instead, correcting its stale museumId.
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

async function scalar(sql, args = []) {
  const result = await db.execute({ sql, args })
  return result.rows[0]
}

async function main() {
  const artist = await scalar(`SELECT id FROM Artist WHERE name LIKE '%Kruyder%'`)
  const artistId = artist.id

  const kalf = await scalar(`SELECT id FROM Artwork WHERE artistId = ? AND title = 'Het kalf'`, [artistId])
  const stierkalf = await scalar(`SELECT id FROM Artwork WHERE artistId = ? AND title = 'Het stierkalf'`, [artistId])
  if (!kalf || !stierkalf) throw new Error('Could not find both Het kalf and Het stierkalf')

  // 1. Revert the wrong Loan + owner on "Het kalf".
  await db.execute({ sql: `DELETE FROM Loan WHERE artworkId = ? AND toMuseumId = 392 AND current = 1`, args: [kalf.id] })
  await db.execute({ sql: `UPDATE Artwork SET private_owner_name = NULL WHERE id = ?`, args: [kalf.id] })
  console.log(`Reverted Loan + private_owner_name on 'Het kalf' (#${kalf.id})`)

  // 2. Apply it correctly to "Het stierkalf": owner is Collectie Regnault, not
  //    a direct museum holding — clear the stale museumId, set the owner.
  await db.execute({ sql: `UPDATE Artwork SET museumId = NULL, private_owner_name = 'Collectie Regnault' WHERE id = ?`, args: [stierkalf.id] })
  const already = await scalar(`SELECT id FROM Loan WHERE artworkId = ? AND toMuseumId = 392 AND current = 1`, [stierkalf.id])
  if (!already) {
    await db.execute({
      sql: `INSERT INTO Loan (artworkId, fromMuseumId, fromOwnerName, toMuseumId, startAt, endAt, current, sourceUrl, createdAt)
            VALUES (?, NULL, 'Collectie Regnault', 392, '2026-09-23', '2027-02-14', 1, ?, CURRENT_TIMESTAMP)`,
      args: [stierkalf.id, 'https://www.singerlaren.nl/nl/agenda/herman-kruyder-expressionist-van-de-ziel-5t3s'],
    })
    console.log(`Set private_owner_name + created Loan on 'Het stierkalf' (#${stierkalf.id})`)
  } else {
    console.log(`'Het stierkalf' already had a current Loan to Singer Laren, left as-is`)
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
