import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 60 * 60

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is niet geconfigureerd`)
  return value
}

function client(): S3Client {
  const accountId = requiredEnv('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY'),
      secretAccessKey: requiredEnv('R2_SECRET_KEY'),
    },
  })
}

function bucket(): string {
  return requiredEnv('R2_PRIVATE_BUCKET')
}

export async function storePhoto(userId: string, dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Foto is te groot of ongeldig')
  }
  const optimized = await sharp(bytes, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
  const key = `photos/${userId}/${randomUUID()}.jpg`
  await client().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
  }))
  return key
}

export async function signedPhotoUrl(key: string): Promise<string> {
  if (key.startsWith('data:')) return key
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  })
}

export async function deletePhoto(key: string): Promise<void> {
  if (key.startsWith('data:')) return
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).catch(() => {})
}

export async function deletePhotoIfOrphaned(userId: string, artworkId: number, key: string): Promise<void> {
  if (key.startsWith('data:')) return
  const [seenMatch, visitMatch] = await Promise.all([
    prisma.seen.findFirst({ where: { userId, artworkId, photo_url: key }, select: { id: true } }),
    prisma.visit.findFirst({ where: { userId, artworkId, photo_url: key }, select: { id: true } }),
  ])
  if (!seenMatch && !visitMatch) await deletePhoto(key)
}
