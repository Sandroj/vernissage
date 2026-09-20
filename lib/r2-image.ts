import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

export const imageExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export function hasValidImageSignature(contentType: string, bytes: Buffer): boolean {
  if (contentType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (contentType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (contentType === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  return false
}

export async function optimizeAndUploadImage(bytes: Buffer): Promise<{ imageUrl: string; originalBytes: number; optimizedBytes: number }> {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET || !R2_PUBLIC_URL) throw new Error('R2_NOT_CONFIGURED')
  const key = `artworks/${randomUUID()}.webp`
  const optimized = await sharp(bytes, { failOn: 'error' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
  const client = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY } })
  await client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: optimized, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }))
  return { imageUrl: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`, originalBytes: bytes.byteLength, optimizedBytes: optimized.byteLength }
}
