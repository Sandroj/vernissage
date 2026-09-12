/**
 * Eenmalig opruimscript: verwijdert "Museum"-rijen die in werkelijkheid een
 * verkoop-/veilinggeschiedenis-zin zijn (bv. "Sold November 9, 2022 at
 * Christie's New York for €8,7 million"), veroorzaakt door een te ruime
 * "holder"-heuristiek in sources/kandinsky_scraper_bundle/kandinsky_scraper.py
 * (nu gefixt). Matcht op tekstinhoud, nooit op id (ids verschillen tussen
 * dev.db en Turso). Zet bij treffers eerst Artwork.museumId op NULL, verwijdert
 * daarna de Museum-rij zelf. Raakt nooit User/Account/Session/Seen/Report.
 *
 * Gebruik: node scripts/cleanup-sale-record-museums.mjs [--apply]
 * Zonder --apply: dry-run, toont alleen wat verwijderd zou worden.
 */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apply = process.argv.includes('--apply')

const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(fs.readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=')
  return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
}))

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
})

const SALE_RECORD_WHERE = `
  name LIKE '%Sold%' OR city LIKE '%Sold%' OR
  name LIKE '%million%' OR city LIKE '%million%' OR
  name LIKE '%auction%' OR city LIKE '%auction%' OR
  length(name) > 60 OR length(city) > 60 OR
  name GLOB '*[0-9][0-9][0-9]*' OR city GLOB '*[0-9][0-9][0-9]*'
`

const bad = await client.execute(`SELECT id, name, city FROM Museum WHERE ${SALE_RECORD_WHERE}`)

if (bad.rows.length === 0) {
  console.log('Geen verdachte Museum-rijen gevonden op Turso.')
  process.exit(0)
}

console.log(`${bad.rows.length} verdachte Museum-rij(en) op Turso:`)
for (const r of bad.rows) {
  console.log(`  #${r.id} name="${r.name}" city="${r.city}"`)
}

if (!apply) {
  console.log('\nDry-run — geen wijzigingen. Draai met --apply om te verwijderen.')
  process.exit(0)
}

const ids = bad.rows.map((r) => r.id)
for (const id of ids) {
  const linked = await client.execute({ sql: 'SELECT COUNT(*) as n FROM Artwork WHERE museumId = ?', args: [id] })
  const n = linked.rows[0].n
  if (n > 0) {
    await client.execute({ sql: 'UPDATE Artwork SET museumId = NULL WHERE museumId = ?', args: [id] })
    console.log(`  Artwork.museumId ontkoppeld voor museum #${id} (${n} werk(en))`)
  }
  await client.execute({ sql: 'DELETE FROM Museum WHERE id = ?', args: [id] })
}
console.log(`\n${ids.length} bogus Museum-rij(en) verwijderd van Turso.`)
