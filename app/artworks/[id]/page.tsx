import { prisma, localizeArtwork } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ArtworkDetailClient from './artwork-detail-client'

export default async function ArtworkDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { returnTo?: string } }) {
  const session = await getServerSession(authOptions)
  const locale = await getLocale()

  const artwork = await prisma.artwork.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      artist: true,
      museum: true,
      loans: { where: { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }, include: { fromMuseum: true, toMuseum: true } },
      _count: {
        select: { seenBy: true },
      },
    },
  })

  if (!artwork) notFound()

  const seen = session?.user?.id
    ? await prisma.seen.findUnique({
        where: { userId_artworkId: { userId: session.user.id, artworkId: artwork.id } },
      })
    : null

  return (
    <ArtworkDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      artwork={localizeArtwork(artwork, locale) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSeen={seen as any}
      seenCount={artwork._count.seenBy}
      isLoggedIn={!!session?.user}
      backHref={searchParams.returnTo?.startsWith('/search') ? searchParams.returnTo : undefined}
    />
  )
}
