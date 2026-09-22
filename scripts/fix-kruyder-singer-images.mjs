/** Use Singer Laren's own exhibition photos (colour, higher quality than what
 * RKD or nothing had) for two works, now that they're uploaded to R2:
 *  - Meisje met maan (#8221) had no image at all yet.
 *  - Portret van Jo Bouman (#8222) only had RKD's black-and-white archival scan.
 * Rights are NOT CC0 here (unlike the RKD-sourced images elsewhere in this
 * catalogue) — this is the museum's own exhibition photography, used for a
 * personal, non-commercial cataloguing app. Recorded honestly in image_rights,
 * not presented as public domain.
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
const RIGHTS_NOTE = 'Singer Laren, expositiefoto — rechten niet expliciet vrijgegeven, gebruikt voor persoonlijke niet-commerciële catalogus op instructie van Sander Regtuijt, 22-09-2026'
const publicUrl = (file) => `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/artworks/${file}`

async function setImage(catalogueId, file) {
  const result = await db.execute({
    sql: `UPDATE Artwork SET image_url = ?, image_local_path = NULL, image_source_url = ?, image_source_name = 'Singer Laren', image_rights = ?, image_retrieved_at = '2026-09-22' WHERE catalogue_id = ?`,
    args: [publicUrl(file), EXHIBITION_URL, RIGHTS_NOTE, catalogueId],
  })
  if (result.rowsAffected === 0) throw new Error(`No Artwork found with catalogue_id ${catalogueId}`)
  console.log(`Updated image for ${catalogueId} -> ${file}`)
}

async function main() {
  await setImage('RKD-276302', 'kruyder-RKD-276302.jpg') // Meisje met maan
  await setImage('RKD-242457', 'kruyder-RKD-242457-color.jpg') // Portret van Jo Bouman
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
