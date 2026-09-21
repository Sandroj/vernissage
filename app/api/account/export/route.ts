import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/account/export
// Downloadbaar JSON-export van alle persoonlijke gegevens van de ingelogde
// gebruiker. Interne opslagsleutels (R2 photo_url) horen hier niet in: die
// zijn geen betekenisvolle data voor de gebruiker, alleen een intern pad.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const userId = session.user.id

  const artworkSelect = { select: { title: true, artist: { select: { name: true } } } } as const

  const [profile, seen, visits, votes, reports] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, seenPublic: true, createdAt: true },
    }),
    prisma.seen.findMany({
      where: { userId },
      select: { dateSeen: true, locationSeen: true, notes: true, rating: true, createdAt: true, artwork: artworkSelect },
    }),
    prisma.visit.findMany({
      where: { userId },
      select: { dateSeen: true, locationSeen: true, notes: true, rating: true, createdAt: true, artwork: artworkSelect },
    }),
    prisma.artistVote.findMany({ where: { userId }, select: { artistName: true, createdAt: true } }),
    prisma.report.findMany({
      where: { userId },
      select: { message: true, status: true, createdAt: true, artwork: { select: { title: true } } },
    }),
  ])

  const data = { exportedAt: new Date().toISOString(), profile, seen, visits, votes, reports }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="vernissage-export.json"',
    },
  })
}
