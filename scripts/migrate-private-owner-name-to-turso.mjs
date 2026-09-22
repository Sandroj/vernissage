/** Apply the Artwork.private_owner_name column (known private-collection owner) to the live Turso DB. */
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

async function main() {
  const columns = await db.execute('PRAGMA table_info("Artwork")')
  const alreadyApplied = columns.rows.some((row) => row.name === 'private_owner_name')
  if (alreadyApplied) {
    console.log('private_owner_name already exists on Turso Artwork table, nothing to do.')
    return
  }
  await db.execute('ALTER TABLE "Artwork" ADD COLUMN "private_owner_name" TEXT')
  console.log('Added private_owner_name to Turso Artwork table.')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.close())
