/** Apply the dateApprox column ("seen it, don't remember exactly when") to the live Turso DB. */
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
  const columns = await db.execute('PRAGMA table_info("Seen")')
  const alreadyApplied = columns.rows.some((row) => row.name === 'dateApprox')
  if (alreadyApplied) {
    console.log('dateApprox already exists on Turso Seen table, nothing to do.')
    return
  }
  await db.execute('ALTER TABLE "Seen" ADD COLUMN "dateApprox" BOOLEAN NOT NULL DEFAULT false')
  console.log('Added dateApprox to Turso Seen table.')
}

main()
