import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtistDetailClient from './artist-detail-client'

export default async function ArtistDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)

  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      artworks: {
        where: { image_url: { not: null } },
        include: { museum: true },
        orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
      },
    },
  })

  if (!artist) notFound()

  const seenRecords = session?.user?.id
    ? await prisma.seen.findMany({
        where: {
          userId: session.user.id,
          artwork: { artistId: artist.id },
        },
      })
    : []

  const seenMap = Object.fromEntries(seenRecords.map((s: { artworkId: number; [key: string]: unknown }) => [s.artworkId, s]))

  return (
    <ArtistDetailClient
      artist={artist}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seenMap={seenMap as any}
      isLoggedIn={!!session?.user}
    />
  )
}
