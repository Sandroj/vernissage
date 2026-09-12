/** Add image-provenance columns to Turso without touching any row data. */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n').filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('=')
    let value = line.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    return [line.slice(0, index), value]
  })
)
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')

const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
const columns = [
  ['image_source_url', 'TEXT'],
  ['image_source_name', 'TEXT'],
  ['image_rights', 'TEXT'],
  ['image_retrieved_at', 'DATETIME'],
]

async function main() {
  const result = await turso.execute('PRAGMA table_info(Artwork)')
  const existing = new Set(result.rows.map(row => String(row.name)))
  for (const [name, type] of columns) {
    if (existing.has(name)) {
      console.log(`exists: Artwork.${name}`)
      continue
    }
    await turso.execute(`ALTER TABLE Artwork ADD COLUMN ${name} ${type}`)
    console.log(`added: Artwork.${name}`)
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => turso.close())
