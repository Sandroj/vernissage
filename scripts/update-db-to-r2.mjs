/**
 * Update alle image_local_path paden in de database naar R2 publieke URLs
 *
 * Gebruik (nadat upload-images-to-r2.mjs klaar is):
 *   R2_PUBLIC_URL=https://pub-xxx.r2.dev node scripts/update-db-to-r2.mjs
 *
 * R2_PUBLIC_URL vind je in Cloudflare dashboard → R2 → jouw bucket → Public Access
 */

import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

const PUBLIC_URL = process.env.R2_PUBLIC_URL
if (!PUBLIC_URL) {
  console.error('Stel R2_PUBLIC_URL in, bijv: R2_PUBLIC_URL=https://pub-xxx.r2.dev')
  process.exit(1)
}

const Database = require('../node_modules/better-sqlite3')
const db = new Database(resolve(__dirname, '../dev.db'))

// Alle artworks met een lokaal pad
const artworks = db.prepare("SELECT id, image_local_path FROM Artwork WHERE image_local_path LIKE '/images/artworks/%'").all()
console.log(`${artworks.length} artworks met lokale paden gevonden`)

const stmt = db.prepare('UPDATE Artwork SET image_url = ?, image_local_path = NULL WHERE id = ?')

let updated = 0
for (const a of artworks) {
  // /images/artworks/vangogh-1.jpg  →  https://pub-xxx.r2.dev/artworks/vangogh-1.jpg
  const filename = a.image_local_path.replace('/images/artworks/', '')
  const r2url = `${PUBLIC_URL}/artworks/${filename}`
  stmt.run(r2url, a.id)
  updated++
}

console.log(`✓ ${updated} artworks bijgewerkt naar R2 URLs`)
console.log(`\nVoorbeeld URL: ${PUBLIC_URL}/artworks/vangogh-1.jpg`)
console.log('\nVervolgens: exporteer de database naar Turso met het migrate-to-turso.sh script')
