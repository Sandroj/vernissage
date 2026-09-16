/** Fill verified German titles from source-page subtitles and Wikidata labels. */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(scriptDir, '..')
const env = Object.fromEntries(fs.readFileSync(resolve(appDir, '.env.local'), 'utf8')
  .split('\n').filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
  }))

const decode = (text) => text
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0*39;|&apos;/gi, "'")
  .replace(/&uuml;/gi, 'ü').replace(/&ouml;/gi, 'ö').replace(/&auml;/gi, 'ä')
  .replace(/&Uuml;/g, 'Ü').replace(/&Ouml;/g, 'Ö').replace(/&Auml;/g, 'Ä')
  .replace(/&szlig;/gi, 'ß')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/\s+/g, ' ').trim()

function parseGermanSubtitle(html) {
  const afterHeading = html.slice(html.search(/<h1\b/i))
  const match = afterHeading.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/i)
  if (!match) return null
  const english = decode(match[1])
  const german = decode(match[2])
  if (!german || german.length > 240 || german.toLowerCase() === english.toLowerCase()) return null
  return german
}

async function mapLimit(items, limit, fn) {
  const values = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      values[index] = await fn(items[index]).catch(() => null)
      await new Promise(resolveSleep => setTimeout(resolveSleep, 180))
    }
  }))
  return values
}

async function fetchWikidataLabels(qids) {
  const entries = await mapLimit(qids, 2, async (batch) => {
    const url = new URL('https://www.wikidata.org/w/api.php')
    url.searchParams.set('action', 'wbgetentities')
    url.searchParams.set('ids', batch.join('|'))
    url.searchParams.set('props', 'labels')
    url.searchParams.set('languages', 'de')
    url.searchParams.set('format', 'json')
    const response = await fetch(url, { headers: { 'User-Agent': 'PinacotArtCatalogue/1.0 (title metadata research)' } })
    if (!response.ok) throw new Error(`Wikidata returned ${response.status}`)
    const json = await response.json()
    return json.entities ?? {}
  })
  return Object.assign({}, ...entries.filter(Boolean))
}

async function main() {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')
  const local = createClient({ url: `file:${resolve(appDir, 'dev.db')}` })
  const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
  const rows = (await local.execute({
    sql: `SELECT id,title,source_url,source_name,catalogue_id FROM Artwork
          WHERE artistId=(SELECT id FROM Artist WHERE slug='wassily-kandinsky') AND title_de IS NULL`,
  })).rows

  const sourcedPages = rows.filter(row => row.source_name === 'wassilykandinsky.net' && row.source_url)
  const pageTitles = await mapLimit(sourcedPages, 4, async (row) => {
    const response = await fetch(String(row.source_url), { headers: { 'User-Agent': 'PinacotArtCatalogue/1.0 (title metadata research)' } })
    if (!response.ok) throw new Error(`Source page returned ${response.status}`)
    return parseGermanSubtitle(await response.text())
  })

  const germanById = new Map()
  sourcedPages.forEach((row, index) => {
    const title = pageTitles[index]
    if (title) germanById.set(Number(row.id), { title, source: String(row.source_url) })
  })

  const wikidataRows = rows.filter(row => /^WD-Q\d+$/.test(String(row.catalogue_id ?? '')))
  const qids = [...new Set(wikidataRows.map(row => String(row.catalogue_id).slice(3)))]
  const batches = []
  for (let index = 0; index < qids.length; index += 40) batches.push(qids.slice(index, index + 40))
  const entities = await fetchWikidataLabels(batches)
  const wikidataByCatalogue = new Map()
  for (const row of wikidataRows) {
    const qid = String(row.catalogue_id).slice(3)
    const title = entities[qid]?.labels?.de?.value
    if (title && title.length <= 240 && title.toLowerCase() !== String(row.title).toLowerCase()) {
      wikidataByCatalogue.set(String(row.catalogue_id), title)
    }
  }

  for (const [id, value] of germanById) {
    await local.execute({ sql: 'UPDATE Artwork SET title_de=? WHERE id=? AND title_de IS NULL', args: [value.title, id] })
    await turso.execute({ sql: 'UPDATE Artwork SET title_de=? WHERE id=? AND title_de IS NULL', args: [value.title, id] })
  }
  for (const [catalogueId, title] of wikidataByCatalogue) {
    await local.execute({ sql: 'UPDATE Artwork SET title_de=? WHERE catalogue_id=? AND title_de IS NULL', args: [title, catalogueId] })
    await turso.execute({ sql: 'UPDATE Artwork SET title_de=? WHERE catalogue_id=? AND title_de IS NULL', args: [title, catalogueId] })
  }

  const localCount = (await local.execute({
    sql: `SELECT COUNT(*) AS total, SUM(CASE WHEN title_de IS NOT NULL THEN 1 ELSE 0 END) AS german
          FROM Artwork WHERE artistId=(SELECT id FROM Artist WHERE slug='wassily-kandinsky')`,
  })).rows[0]
  const remoteCount = (await turso.execute({
    sql: `SELECT COUNT(*) AS total, SUM(CASE WHEN title_de IS NOT NULL THEN 1 ELSE 0 END) AS german
          FROM Artwork WHERE artistId=(SELECT id FROM Artist WHERE slug='wassily-kandinsky')`,
  })).rows[0]
  console.log(JSON.stringify({ pagesChecked: sourcedPages.length, sourcePageTitles: germanById.size, wikidataLabels: wikidataByCatalogue.size, local: localCount, turso: remoteCount }, null, 2))
  await Promise.all([local.close(), turso.close()])
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
