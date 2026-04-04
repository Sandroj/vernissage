/**
 * Upload alle lokale afbeeldingen naar Cloudflare R2
 *
 * Gebruik:
 *   R2_ACCOUNT_ID=xxx R2_ACCESS_KEY=xxx R2_SECRET_KEY=xxx R2_BUCKET=arttracker-images node scripts/upload-images-to-r2.mjs
 *
 * Daarna: node scripts/update-db-to-r2.mjs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readdir, readFile } from 'fs/promises'
import { join, extname } from 'path'

const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID
const ACCESS_KEY  = process.env.R2_ACCESS_KEY
const SECRET_KEY  = process.env.R2_SECRET_KEY
const BUCKET      = process.env.R2_BUCKET ?? 'arttracker-images'
const PUBLIC_URL  = process.env.R2_PUBLIC_URL  // bijv. https://pub-xxx.r2.dev  (na public access aan te zetten)

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Stel R2_ACCOUNT_ID, R2_ACCESS_KEY en R2_SECRET_KEY in als omgevingsvariabelen.')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const IMAGES_DIR = new URL('../public/images/artworks', import.meta.url).pathname
const files = await readdir(IMAGES_DIR)
const imageFiles = files.filter((f) => MIME[extname(f).toLowerCase()])

console.log(`${imageFiles.length} afbeeldingen gevonden in public/images/artworks/`)
console.log(`Uploaden naar R2 bucket: ${BUCKET}\n`)

let uploaded = 0
let skipped = 0
let errors = 0
const CONCURRENCY = 20

async function uploadFile(filename) {
  const key = `artworks/${filename}`
  const contentType = MIME[extname(filename).toLowerCase()] ?? 'image/jpeg'

  // Check of bestand al bestaat
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    skipped++
    return
  } catch {
    // Bestaat nog niet — uploaden
  }

  try {
    const body = await readFile(join(IMAGES_DIR, filename))
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    uploaded++
    if (uploaded % 100 === 0) {
      console.log(`  ✓ ${uploaded} geüpload, ${skipped} overgeslagen, ${errors} fouten...`)
    }
  } catch (err) {
    errors++
    console.error(`  ✗ ${filename}: ${err.message}`)
  }
}

// Upload in batches van CONCURRENCY tegelijk
for (let i = 0; i < imageFiles.length; i += CONCURRENCY) {
  const batch = imageFiles.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map(uploadFile))
}

console.log(`\nKlaar!`)
console.log(`  Geüpload:    ${uploaded}`)
console.log(`  Overgeslagen: ${skipped} (bestonden al)`)
console.log(`  Fouten:      ${errors}`)

if (PUBLIC_URL) {
  console.log(`\nJe publieke R2 URL: ${PUBLIC_URL}/artworks/<bestandsnaam>`)
}
