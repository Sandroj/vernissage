import { NextResponse } from 'next/server'
import { getAdminEmail } from '@/lib/admin'
import { imageExtensions, hasValidImageSignature, optimizeAndUploadImage } from '@/lib/r2-image'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !imageExtensions[file.type] || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Kies een JPEG-, PNG- of WebP-bestand van maximaal 25 MB.' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!hasValidImageSignature(file.type, bytes)) return NextResponse.json({ error: 'Bestandstype komt niet overeen met de inhoud van het beeld.' }, { status: 400 })
  try {
    const result = await optimizeAndUploadImage(bytes)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'R2_NOT_CONFIGURED') return NextResponse.json({ error: 'R2-upload is nog niet geconfigureerd.' }, { status: 503 })
    return NextResponse.json({ error: 'Upload naar de afbeeldingsopslag is mislukt.' }, { status: 502 })
  }
}
