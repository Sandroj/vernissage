/**
 * Voegt de ontbrekende afbeelding toe aan Yayoi Kusama's "Pumpkin (No. 1)"
 * (catalogue_id YK-1994-pumpkin-no-1, id 8033) — de gele pompoen op de pier
 * bij Miyanoura, Naoshima. Bron: officiële Benesse Art Site Naoshima-blogpost
 * met een foto van Kusama naast het origineel uit 1994.
 * https://benesse-artsite.jp/en/story/20210611-1661.html
 *
 * Volgt het R2-verwerkingspad uit docs/catalogue-and-image-standard.md:
 * optimaliseren zoals de app zelf doet (lib/r2-image.ts), uploaden naar R2,
 * dev.db bijwerken, daarna gericht naar Turso syncen.
 *
 * Gebruik: node scripts/add-kusama-pumpkin-1994-image.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@libsql/client'
import fs from 'fs'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const SOURCE_IMAGE_URL = 'https://benesse-artsite.jp/en/story/uploads/story/20200819_kusama-san.png'
const SOURCE_PAGE_URL = 'https://benesse-artsite.jp/en/story/20210611-1661.html'
const SOURCE_NAME = 'Benesse Art Site Naoshima'
const CATALOGUE_ID = 'YK-1994-pumpkin-no-1'
const R2_KEY = 'artworks/kusama-YK-1994-pumpkin-no-1.jpg'
const RETRIEVED_AT = new Date().toISOString().slice(0, 10)

const env = Object.fromEntries(
  fs.readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    return [l.slice(0, i), v]
  })
)
for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']) {
  if (!env[key]) { console.error(`${key} ontbreekt in .env.local`); process.exit(1) }
}

async function main() {
  console.log(`Downloaden: ${SOURCE_IMAGE_URL}`)
  const res = await fetch(SOURCE_IMAGE_URL)
  if (!res.ok) throw new Error(`Download mislukt: HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  console.log(`${bytes.byteLength} bytes opgehaald`)

  const optimized = await sharp(bytes, { failOn: 'error' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()
  console.log(`Geoptimaliseerd naar ${optimized.byteLength} bytes JPEG`)

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY, secretAccessKey: env.R2_SECRET_KEY },
  })
  await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: R2_KEY, Body: optimized, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }))
  const imageUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${R2_KEY}`
  console.log(`Geüpload naar R2: ${imageUrl}`)

  const db = new Database(resolve(__dirname, '../dev.db'))
  const devResult = db.prepare(
    `UPDATE Artwork SET image_url = ?, image_local_path = NULL, image_source_url = ?, image_source_name = ?, image_retrieved_at = ? WHERE catalogue_id = ?`
  ).run(imageUrl, SOURCE_PAGE_URL, SOURCE_NAME, RETRIEVED_AT, CATALOGUE_ID)
  console.log(`dev.db bijgewerkt: ${devResult.changes} rij(en)`)
  db.close()

  const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
  const tursoResult = await turso.execute({
    sql: `UPDATE Artwork SET image_url = ?, image_local_path = NULL, image_source_url = ?, image_source_name = ?, image_retrieved_at = ? WHERE catalogue_id = ?`,
    args: [imageUrl, SOURCE_PAGE_URL, SOURCE_NAME, RETRIEVED_AT, CATALOGUE_ID],
  })
  console.log(`Turso bijgewerkt: ${tursoResult.rowsAffected} rij(en)`)
  turso.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
