import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtworkDetailClient from './artwork-detail-client'

export default async function ArtworkDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const artwork = await prisma.artwork.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      artist: true,
      museum: true,
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
      artwork={artwork as any}
      initialSeen={seen as any}
      seenCount={artwork._count.seenBy}
      isLoggedIn={!!session?.user}
    />
  )
}
