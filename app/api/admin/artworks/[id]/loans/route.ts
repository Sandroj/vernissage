import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const artworkId = Number(params.id)
  const body = await req.json().catch(() => null)
  const toMuseumId = Number(body?.toMuseumId)
  const fromMuseumId = body?.fromMuseumId ? Number(body.fromMuseumId) : null
  const fromOwnerName = typeof body?.fromOwnerName === 'string' ? body.fromOwnerName.trim().slice(0, 200) : ''
  const sourceUrl = typeof body?.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  if (!Number.isInteger(artworkId) || !Number.isInteger(toMuseumId) || (fromMuseumId !== null && !Number.isInteger(fromMuseumId))) return NextResponse.json({ error: 'Kies een geldig werk en ontvangend museum.' }, { status: 400 })
  if (!fromMuseumId && !fromOwnerName) return NextResponse.json({ error: 'Vul het uitlenende museum of de eigenaar in.' }, { status: 400 })
  if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) return NextResponse.json({ error: 'Voeg een https-bron toe die de bruikleen bevestigt.' }, { status: 400 })
  const startsAt = body?.startAt ? new Date(body.startAt) : null
  const endsAt = body?.endAt ? new Date(body.endAt) : null
  if ((startsAt && isNaN(startsAt.getTime())) || (endsAt && isNaN(endsAt.getTime())) || (startsAt && endsAt && endsAt < startsAt)) return NextResponse.json({ error: 'Controleer de uitleendatums.' }, { status: 400 })
  try {
    const loan = await prisma.$transaction(async (tx) => {
      await tx.artwork.findUniqueOrThrow({ where: { id: artworkId } })
      await tx.museum.findUniqueOrThrow({ where: { id: toMuseumId } })
      if (fromMuseumId) await tx.museum.findUniqueOrThrow({ where: { id: fromMuseumId } })
      await tx.loan.updateMany({ where: { artworkId, current: true }, data: { current: false, endAt: new Date() } })
      return tx.loan.create({ data: { artworkId, fromMuseumId, fromOwnerName: fromOwnerName || null, toMuseumId, startAt: startsAt, endAt: endsAt, sourceUrl: sourceUrl || null, verifiedAt: new Date(), current: true } })
    })
    return NextResponse.json(loan, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Uitleen kon niet worden opgeslagen.' }, { status: 400 })
  }
}
