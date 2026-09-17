import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'

// POST /api/visits — Plus-only. Logs an additional visit to an artwork and
// keeps the existing Seen row (read by 11 other places in the app) synced
// to the newest visit, so none of those call sites need to change.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!(await hasActiveEntitlement(session.user.id))) {
    return NextResponse.json({ error: 'Dit vereist Pinacot Plus.' }, { status: 403 })
  }

  const { artworkId, dateSeen, locationSeen, notes, rating, photo_url } = await req.json()
  const userId = session.user.id

  const visit = await prisma.visit.create({
    data: {
      userId,
      artworkId,
      dateSeen: new Date(dateSeen),
      locationSeen: locationSeen || null,
      notes: notes || null,
      rating: rating ?? null,
      photo_url: photo_url || null,
    },
  })

  await prisma.seen.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    update: { dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
    create: { userId, artworkId, dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
  })

  return NextResponse.json(visit, { status: 201 })
}

// GET /api/visits?artworkId=123 — no Plus gate: a lapsed subscriber must
// still be able to see visits they logged while they were subscribed.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const artworkId = parseInt(new URL(req.url).searchParams.get('artworkId') ?? '')
  if (!artworkId) return NextResponse.json({ error: 'artworkId is verplicht' }, { status: 400 })

  const visits = await prisma.visit.findMany({
    where: { userId: session.user.id, artworkId },
    orderBy: { dateSeen: 'desc' },
  })

  return NextResponse.json(visits)
}
