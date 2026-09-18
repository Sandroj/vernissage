import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { deletePhotoIfOrphaned } from '@/lib/photo-storage'

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
    // Best-effort synced cache: a direct edit via POST /api/seen can still
    // overwrite these fields later. No reconciliation between the two paths
    // exists yet (accepted limitation, see plan review Finding F).
    await prisma.seen.update({
      where: { userId_artworkId: { userId, artworkId: deleted.artworkId } },
      data: { dateSeen: latest.dateSeen, locationSeen: latest.locationSeen, notes: latest.notes, rating: latest.rating, photo_url: latest.photo_url },
    }).catch(() => {}) // no Seen row to update — fine, nothing to sync
  }
  // No visits left: Seen stays exactly as it was, per the spec's edge cases.

  // Runs after the delete and the (possible) Seen resync above, so it sees
  // current state: if Seen was resynced away from this key, or no other
  // visit shares it, it's genuinely orphaned now. If no visits remained and
  // Seen still holds this exact key (the untouched-Seen case just above),
  // the lookup inside deletePhotoIfOrphaned finds that and skips deletion.
  if (deleted.photo_url) {
    await deletePhotoIfOrphaned(userId, deleted.artworkId, deleted.photo_url)
  }

  return NextResponse.json({ ok: true })
}
