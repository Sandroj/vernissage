import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'

const fields = [
  'title', 'title_de', 'year_start', 'year_end', 'medium_raw', 'type_normalized',
  'dimensions_raw', 'museumId', 'image_url', 'image_source_url', 'image_source_name',
  'image_rights', 'source_url', 'source_name', 'catalogue_id', 'jh_catalogue_id',
  'image_retrieved_at', 'alternate_titles', 'attribution_status', 'attribution_note', 'attribution_note_en',
] as const

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ongeldig werk' }, { status: 400 })
  const artwork = await prisma.artwork.findUnique({ where: { id }, include: { artist: true, museum: true, loans: { orderBy: { createdAt: 'desc' }, take: 8, include: { fromMuseum: true, toMuseum: true } }, edits: { orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, editorEmail: true, createdAt: true, sourceUrl: true } } } })
  return artwork ? NextResponse.json(artwork) : NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const editorEmail = await getAdminEmail()
  if (!editorEmail) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const id = Number(params.id)
  const body = await req.json().catch(() => null)
  if (!Number.isInteger(id) || !body || typeof body !== 'object') return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  const data: Record<string, string | number | Date | null> = {}
  for (const field of fields) {
    if (!(field in body)) continue
    const value = body[field]
    if (field === 'image_retrieved_at') {
      const date = value === '' || value === null ? null : new Date(value)
      if (date && isNaN(date.getTime())) return NextResponse.json({ error: 'Ongeldige ophaaldatum' }, { status: 400 })
      data[field] = date
    } else if (field === 'year_start' || field === 'year_end' || field === 'museumId') {
      const number = value === '' || value === null ? null : Number(value)
      if (number !== null && !Number.isInteger(number)) return NextResponse.json({ error: `Ongeldige waarde voor ${field}` }, { status: 400 })
      data[field] = number
    } else {
      if (value !== null && typeof value !== 'string') return NextResponse.json({ error: `Ongeldige waarde voor ${field}` }, { status: 400 })
      const text = typeof value === 'string' ? value.trim() : null
      if (text && text.length > (field.includes('note') ? 3000 : 1000)) return NextResponse.json({ error: `Waarde te lang: ${field}` }, { status: 400 })
      data[field] = text || null
    }
  }
  if (typeof data.title === 'string' && !data.title) return NextResponse.json({ error: 'Titel mag niet leeg zijn' }, { status: 400 })
  for (const urlField of ['image_url', 'image_source_url', 'source_url'] as const) {
    const value = data[urlField]
    if (typeof value === 'string' && value && !/^https:\/\//i.test(value)) return NextResponse.json({ error: `${urlField} moet een https-link zijn` }, { status: 400 })
  }
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : null
  if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) return NextResponse.json({ error: 'sourceUrl moet een https-link zijn' }, { status: 400 })

  try {
    const before = await prisma.artwork.findUniqueOrThrow({ where: { id } })
    if (typeof data.image_url === 'string' && data.image_url !== before.image_url) {
      if (!data.image_source_url || !data.image_source_name || !data.image_rights || !data.image_retrieved_at) return NextResponse.json({ error: 'Voor een nieuwe afbeelding zijn bronlink, bronnaam, rechtennotitie en ophaaldatum verplicht.' }, { status: 400 })
      const r2Prefix = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
      if (!r2Prefix || !data.image_url.startsWith(`${r2Prefix}/`)) return NextResponse.json({ error: 'Nieuwe afbeeldingen moeten eerst via de upload in R2 worden gezet.' }, { status: 400 })
      data.image_local_path = null
    }
    const after = await prisma.$transaction(async (tx) => {
      const updated = await tx.artwork.update({ where: { id }, data: data as never })
      await tx.artworkEdit.create({ data: { artworkId: id, editorEmail, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(updated), sourceUrl } })
      return updated
    })
    return NextResponse.json(after)
  } catch {
    return NextResponse.json({ error: 'Werk kon niet worden bijgewerkt; controleer museum- en catalogus-ID’s.' }, { status: 400 })
  }
}
