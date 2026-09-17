import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'

// DELETE /api/visits/[id] — Plus-only. Removes a visit and resyncs the
// existing Seen row (read by 11 other places in the app) to the
// next-most-recent remaining visit. If none remain, Seen is left untouched.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!(await hasActiveEntitlement(session.user.id))) {
    return NextResponse.json({ error: 'Dit vereist Pinacot Plus.' }, { status: 403 })
  }

  const userId = session.user.id
  let deleted
  try {
    deleted = await prisma.visit.delete({
      where: { id: parseInt(params.id), userId },
    })
  } catch {
    return NextResponse.json({ error: 'Bezoek niet gevonden' }, { status: 404 })
  }

  const latest = await prisma.visit.findFirst({
    where: { userId, artworkId: deleted.artworkId },
    orderBy: { dateSeen: 'desc' },
  })

  if (latest) {
    await prisma.seen.update({
      where: { userId_artworkId: { userId, artworkId: deleted.artworkId } },
      data: { dateSeen: latest.dateSeen, locationSeen: latest.locationSeen, notes: latest.notes, rating: latest.rating, photo_url: latest.photo_url },
    }).catch(() => {}) // no Seen row to update — fine, nothing to sync
  }
  // No visits left: Seen stays exactly as it was, per the spec's edge cases.

  return NextResponse.json({ ok: true })
}
