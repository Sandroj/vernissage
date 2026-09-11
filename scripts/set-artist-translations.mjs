/**
 * Zet Artist.nationality (NL), nationality_en en bio_en voor de vier kunstenaars,
 * in dev.db én Turso. Idempotent. Vereist dat de kolommen bestaan
 * (migratie 20260911180000_add_artist_translations).
 *
 *   node scripts/set-artist-translations.mjs
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const DATA = {
  'Vincent van Gogh': {
    nationality: 'Nederlands', nationality_en: 'Dutch',
    bio_en: 'Vincent Willem van Gogh (1853–1890) was a Dutch Post-Impressionist painter and one of the most famous and influential figures in the history of Western art. In just over a decade he created some 2,100 artworks, including around 860 oil paintings. His work is known for its expressive brushwork, bold colours and emotional honesty.',
  },
  'Claude Monet': {
    nationality: 'Frans', nationality_en: 'French',
    bio_en: 'Oscar-Claude Monet (1840–1926) was a French Impressionist painter and a founder of the Impressionist movement. He is known for his plein-air paintings and for his series of water lilies, haystacks and Rouen Cathedral.',
  },
  'Gustav Klimt': {
    nationality: 'Oostenrijks', nationality_en: 'Austrian',
    bio_en: 'Gustav Klimt (1862–1918) was an Austrian Symbolist painter and one of the most prominent members of the Vienna Secession. He is famous for his golden paintings, most notably The Kiss and Portrait of Adele Bloch-Bauer I.',
  },
  'Wassily Kandinsky': {
    nationality: 'Russisch', nationality_en: 'Russian',
    bio_en: 'Wassily Kandinsky (1866–1944) was a Russian-French painter and art theorist, regarded as a pioneer of abstract art. He taught at the Bauhaus and developed a far-reaching theory of colour and form.',
  },
}

const env = Object.fromEntries(
  fs.readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('='); let v = l.slice(i + 1).trim()
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1)
    return [l.slice(0, i), v]
  })
)

const SQL = 'UPDATE Artist SET nationality = ?, nationality_en = ?, bio_en = ? WHERE name = ?'
const rows = Object.entries(DATA).map(([name, d]) => [d.nationality, d.nationality_en, d.bio_en, name])

const db = new Database(resolve(__dirname, '../dev.db'))
const stmt = db.prepare(SQL)
let local = 0
for (const r of rows) local += stmt.run(...r).changes
db.close()
console.log(`dev.db: ${local} artists bijgewerkt`)

const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
const res = await turso.batch(rows.map(args => ({ sql: SQL, args })), 'write')
console.log(`Turso: ${res.reduce((n, r) => n + r.rowsAffected, 0)} artists bijgewerkt`)
turso.close()
