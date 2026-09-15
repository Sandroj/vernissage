import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { getAdminEmail } from '@/lib/admin'

export const runtime = 'nodejs'
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function POST(req: Request) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !extensions[file.type] || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Kies een JPEG-, PNG- of WebP-bestand van maximaal 8 MB.' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  const validSignature = file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!validSignature) return NextResponse.json({ error: 'Bestandstype komt niet overeen met de inhoud van het beeld.' }, { status: 400 })
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return NextResponse.json({ error: 'R2-upload is nog niet geconfigureerd.' }, { status: 503 })
  const key = `artworks/${randomUUID()}.${extensions[file.type]}`
  try {
    const client = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY } })
    await client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: bytes, ContentType: file.type, CacheControl: 'public, max-age=31536000, immutable' }))
    return NextResponse.json({ imageUrl: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}` })
  } catch {
    return NextResponse.json({ error: 'Upload naar de afbeeldingsopslag is mislukt.' }, { status: 502 })
  }
}
