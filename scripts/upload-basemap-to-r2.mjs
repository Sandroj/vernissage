/**
 * Upload een self-hosted Protomaps PMTiles-basemap naar de bestaande R2-bucket.
 *
 * Gebruik:
 *   R2_ACCOUNT_ID=xxx R2_ACCESS_KEY=xxx R2_SECRET_KEY=xxx R2_BUCKET=arttracker-images \
 *   node scripts/upload-basemap-to-r2.mjs /pad/naar/world-lowzoom.pmtiles
 *
 * Vervangt de CARTO-tegelservice (components/museum-map.tsx): geen API-key,
 * geen per-tile-kosten, alleen de bestaande R2-opslag/CDN.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile } from 'fs/promises'

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY = process.env.R2_ACCESS_KEY
const SECRET_KEY = process.env.R2_SECRET_KEY
const BUCKET = process.env.R2_BUCKET ?? 'arttracker-images'
const KEY = 'basemaps/world-lowzoom.pmtiles'

const localPath = process.argv[2]
if (!localPath) {
  console.error('Gebruik: node scripts/upload-basemap-to-r2.mjs /pad/naar/world-lowzoom.pmtiles')
  process.exit(1)
}
if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Stel R2_ACCOUNT_ID, R2_ACCESS_KEY en R2_SECRET_KEY in als omgevingsvariabelen.')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

const body = await readFile(localPath)
console.log(`Uploaden van ${localPath} (${(body.length / 1024 / 1024).toFixed(1)} MB) naar ${BUCKET}/${KEY}...`)

await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: KEY,
  Body: body,
  ContentType: 'application/octet-stream',
  CacheControl: 'public, max-age=31536000, immutable',
}))

console.log(`Klaar. Publieke URL (als R2_PUBLIC_URL bekend is): ${process.env.R2_PUBLIC_URL ?? '<R2_PUBLIC_URL>'}/${KEY}`)
