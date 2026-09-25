import { prisma, localizeArtwork, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { signPhotoUrls } from '@/lib/photo-storage'
import ArtworkDetailClient from './artwork-detail-client'
import { unstable_cache } from 'next/cache'

// Kunstwerk-data zelf is publieke catalogus-data — cachen scheelt een
// Turso-roundtrip per bezoeker.
const getCachedArtwork = unstable_cache(
  (id: number) =>
    prisma.artwork.findUnique({
      where: { id },
      include: {
        artist: true,
        museum: true,
        loans: { where: { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }, include: { fromMuseum: true, toMuseum: true } },
        _count: {
          select: { seenBy: true },
        },
      },
    }),
  ['artwork-detail'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function ArtworkDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { returnTo?: string } }) {
  const [session, locale, artwork] = await Promise.all([
    getServerSession(authOptions),
    getLocale(),
    getCachedArtwork(parseInt(params.id)),
  ])
  const isAdmin = isAdminEmail(session?.user?.email)

  if (!artwork) notFound()

  const [seenRow, isPlus, wanted] = await Promise.all([
    session?.user?.id
      ? prisma.seen.findUnique({
          where: { userId_artworkId: { userId: session.user.id, artworkId: artwork.id } },
        })
      : Promise.resolve(null),
    session?.user?.id ? hasActiveEntitlement(session.user.id) : Promise.resolve(false),
    session?.user?.id
      ? prisma.wantToSee.count({ where: { userId: session.user.id, artworkId: artwork.id } })
      : Promise.resolve(0),
  ])

  const seen = seenRow ? (await signPhotoUrls([seenRow]))[0] : seenRow

  return (
    <ArtworkDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      artwork={localizeArtwork(artwork, locale) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSeen={seen as any}
      seenCount={artwork._count.seenBy}
      initialWanted={wanted > 0}
      isLoggedIn={!!session?.user}
      isPlus={isPlus}
      isAdmin={isAdmin}
      backHref={searchParams.returnTo?.startsWith('/search') ? searchParams.returnTo : undefined}
    />
  )
}
