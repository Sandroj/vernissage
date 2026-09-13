/**
 * Mark F1666 as unclassified. VGGallery explicitly says the medium cannot be
 * established and lists the work in both its paintings and drawings sections.
 * Updates only the one Artwork row by stable catalogue_id.
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { copyFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const env = Object.fromEntries(readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n').filter((line) => line.includes('=')).map((line) => {
  const index = line.indexOf('=')
  let value = line.slice(index + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
  return [line.slice(0, index), value]
}))

const label = 'unclassified'
const dbPath = resolve(__dirname, '../dev.db')
const backup = `${dbPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-before-f1666-classification`
copyFileSync(dbPath, backup)
const local = new Database(dbPath)
const localResult = local.prepare("UPDATE Artwork SET type_normalized = ? WHERE catalogue_id = 'F1666'").run(label)
local.close()

if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')
const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
const production = await turso.execute({ sql: "UPDATE Artwork SET type_normalized = ? WHERE catalogue_id = 'F1666'", args: [label] })
const check = await turso.execute({ sql: "SELECT catalogue_id, type_normalized FROM Artwork WHERE catalogue_id = 'F1666'" })
turso.close()
console.log(`dev.db updated: ${localResult.changes}; Turso updated: ${production.rowsAffected};`, check.rows[0])
