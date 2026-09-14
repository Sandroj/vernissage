/**
 * Restore complementary fields from the deleted Kandinsky duplicate rows.
 * This is intentionally separate from the destructive merge script: it only
 * fills empty fields on the surviving institutional rows and applies one
 * manually reviewed image choice (Gabriele Münter, 5302 <- old 12).
 *
 * Usage:
 *   node scripts/enrich-kandinsky-merged-records.mjs
 *   node scripts/enrich-kandinsky-merged-records.mjs --apply
 */
import { createClient } from '@libsql/client'
import { resolve } from 'path'
import fs from 'fs'

const appDir = resolve(new URL('.', import.meta.url).pathname, '..')
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync(resolve(appDir, '.env.local'), 'utf8')
  .split('\n')
  .filter((line) => line.includes('='))
  .map((line) => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
  }))

const backup = JSON.parse(fs.readFileSync('/tmp/kandinsky-duplicate-backup-dev-1789380674829.json', 'utf8'))
const oldById = new Map(backup.artwork.map((row) => [Number(row.id), row]))
const merges = [
  [5482, 325], [5442, 307], [5302, 12], [5490, 2], [5518, 115],
  [5311, 22], [5314, 188], [5463, 124], [5495, 229], [5453, 402],
  [5304, 129], [5503, 404], [5526, 508], [5532, 24], [5305, 28],
  [5298, 137], [5448, 426], [5423, 95], [5284, 351], [5394, 194],
  [5514, 592], [5320, 244], [5318, 187], [5390, 280], [5333, 199],
  [5431, 161], [5299, 55], [5414, 487], [5291, 241], [5417, 270],
]
const imageOverride = { keep: 5302, old: 12 }
const keepIds = merges.map(([keep]) => keep)
const targets = [
  { name: 'local dev.db', client: createClient({ url: `file:${resolve(appDir, 'dev.db')}` }) },
  { name: 'Turso production', client: createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }) },
]

async function rows(client, sql, args = []) {
  const result = await client.execute({ sql, args })
  return result.rows.map((row) => Object.fromEntries(Object.entries(row)))
}

const oldMuseumIds = [...new Set(backup.artwork.map((row) => row.museumId).filter((id) => id != null).map(Number))]
const museumPlaceholders = oldMuseumIds.map(() => '?').join(',')
const sourceMuseums = await rows(
  targets[0].client,
  `SELECT id,name,city,country FROM Museum WHERE id IN (${museumPlaceholders})`,
  oldMuseumIds,
)
const sourceMuseumById = new Map(sourceMuseums.map((museum) => [Number(museum.id), museum]))
if (sourceMuseums.length !== oldMuseumIds.length) throw new Error('local dev.db: old museum reference missing')

for (const target of targets) {
  const { client } = target
  const placeholders = keepIds.map(() => '?').join(',')
  const current = await rows(client, `SELECT id,museumId,dimensions_raw,image_url,image_source_url,image_source_name FROM Artwork WHERE id IN (${placeholders})`, keepIds)
  const currentById = new Map(current.map((row) => [Number(row.id), row]))
  if (current.length !== keepIds.length) throw new Error(`${target.name}: not all keep rows exist`)
  const targetMuseums = await rows(client, 'SELECT id,name,city,country FROM Museum')
  const targetMuseumByKey = new Map(targetMuseums.map((museum) => [`${museum.name}\u0000${museum.city}\u0000${museum.country}`, museum]))

  console.log(`\n${target.name}:`)
  const updates = []
  for (const [keep, oldId] of merges) {
    const currentRow = currentById.get(keep)
    const old = oldById.get(oldId)
    const fill = {}
    if (currentRow.museumId == null && old.museumId != null) {
      const sourceMuseum = sourceMuseumById.get(Number(old.museumId))
      const targetMuseum = targetMuseumByKey.get(`${sourceMuseum.name}\u0000${sourceMuseum.city}\u0000${sourceMuseum.country}`)
      if (!targetMuseum) throw new Error(`${target.name}: museum not found: ${sourceMuseum.name}, ${sourceMuseum.city}, ${sourceMuseum.country}`)
      fill.museumId = Number(targetMuseum.id)
    }
    if (!currentRow.dimensions_raw && old.dimensions_raw) fill.dimensions_raw = old.dimensions_raw
    if (keep === imageOverride.keep) {
      fill.image_url = old.image_url
      fill.image_source_url = old.source_url
      fill.image_source_name = old.source_name
    }
    if (Object.keys(fill).length) {
      updates.push({ keep, oldId, fill })
      console.log(`  ${keep} <- ${oldId}: ${Object.keys(fill).join(', ')}`)
    }
  }

  const museumIds = [...new Set(updates.map((update) => update.fill.museumId).filter(Boolean))]
  if (museumIds.length) {
    const museums = await rows(client, `SELECT id,name,city,country FROM Museum WHERE id IN (${museumIds.map(() => '?').join(',')})`, museumIds)
    if (museums.length !== museumIds.length) throw new Error(`${target.name}: complementary museum row missing`)
    for (const museum of museums) console.log(`    museum ${museum.id}: ${museum.name}, ${museum.city}`)
  }

  if (!apply) continue
  const backupPath = `/tmp/kandinsky-enrichment-backup-${target.name === 'local dev.db' ? 'dev' : 'turso'}-${Date.now()}.json`
  fs.writeFileSync(backupPath, JSON.stringify({ artwork: current }, null, 2))
  console.log(`  backup: ${backupPath}`)
  for (const update of updates) {
    const fields = Object.keys(update.fill)
    await client.execute({
      sql: `UPDATE Artwork SET ${fields.map((field) => `${field}=?`).join(', ')} WHERE id=?`,
      args: [...fields.map((field) => update.fill[field]), update.keep],
    })
  }
  console.log('  applied')
}

console.log(apply ? '\nKandinsky complementary fields applied to dev.db and Turso.' : '\nDry run only; pass --apply to change both databases.')
