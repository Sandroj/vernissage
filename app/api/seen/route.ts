import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const { artworkId, dateSeen, dateApprox, locationSeen, notes, rating } = body
  const userId = session.user.id
  const photoTouched = 'photo_url' in body

  if (photoTouched) {
    const incoming = body.photo_url as string | null
    if (incoming && !incoming.startsWith('data:')) {
      return NextResponse.json({ error: 'Ongeldige foto' }, { status: 400 })
    }
  }

  const existing = photoTouched
    ? await prisma.seen.findUnique({ where: { userId_artworkId: { userId, artworkId } }, select: { photo_url: true } })
    : null

  let storedKey: string | null = null
  if (photoTouched && body.photo_url) {
    try {
      storedKey = await storePhoto(userId, body.photo_url)
    } catch (err) {
      console.error('POST /api/seen: storePhoto failed', { userId, artworkId }, err)
      return NextResponse.json({ error: 'Kon de foto niet opslaan' }, { status: 400 })
    }
  }

  const photoField = photoTouched ? { photo_url: storedKey } : {}

  const resolvedDateSeen = dateApprox ? new Date() : new Date(dateSeen)
  const seen = await prisma.seen.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    update: { dateSeen: resolvedDateSeen, dateApprox: !!dateApprox, locationSeen, notes, rating, ...photoField },
    create: { userId, artworkId, dateSeen: resolvedDateSeen, dateApprox: !!dateApprox, locationSeen, notes, rating, ...photoField },
  })
  // Gezien = van de verlanglijst af.
  await prisma.wantToSee.deleteMany({ where: { userId, artworkId } })

  if (photoTouched && existing?.photo_url && existing.photo_url !== storedKey) {
    await deletePhotoIfOrphaned(userId, artworkId, existing.photo_url)
  }

  return NextResponse.json(seen, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId } = await req.json()
  const parsedArtworkId = Number(artworkId)
  if (!Number.isInteger(parsedArtworkId) || parsedArtworkId <= 0) {
    return NextResponse.json({ error: 'Ongeldig werk' }, { status: 400 })
  }

  const userId = session.user.id
  const existing = await prisma.seen.findUnique({
    where: { userId_artworkId: { userId, artworkId: parsedArtworkId } },
    select: { photo_url: true },
  })

  await prisma.seen.deleteMany({
    where: { userId, artworkId: parsedArtworkId },
  })

  if (existing?.photo_url) {
    await deletePhotoIfOrphaned(userId, parsedArtworkId, existing.photo_url)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const seen = await prisma.seen.findMany({
    where: { userId: session.user.id },
    include: { artwork: { include: { artist: true, museum: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const signed = await Promise.all(seen.map(async (row) => ({
    ...row,
    photo_url: row.photo_url ? await signedPhotoUrl(row.photo_url) : row.photo_url,
  })))

  return NextResponse.json(signed)
}
