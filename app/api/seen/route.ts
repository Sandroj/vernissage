import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId, dateSeen, locationSeen, notes, rating, photo_url } = await req.json()

  const seen = await prisma.seen.upsert({
    where: { userId_artworkId: { userId: session.user.id, artworkId } },
    update: { dateSeen: new Date(dateSeen), locationSeen, notes, rating, photo_url },
    create: {
      userId: session.user.id,
      artworkId,
      dateSeen: new Date(dateSeen),
      locationSeen,
      notes,
      rating,
      photo_url,
    },
  })

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

  await prisma.seen.deleteMany({
    where: { userId: session.user.id, artworkId: parsedArtworkId },
  })

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

  return NextResponse.json(seen)
}
