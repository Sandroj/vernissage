import { prisma, hasImage, localizeArtist } from '@/lib/prisma'
import { getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtistDetailClient from './artist-detail-client'
import { proxyImg } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

export default async function ArtistDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)
  const locale = await getLocale()
  const tc = await getTranslations('Countries')
  const catalogueWhere = params.slug === 'vincent-van-gogh'
    ? { catalogue_id: { not: null } }
    : {}

  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      artworks: {
        where: catalogueWhere,
        include: { museum: true },
        orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
      },
    },
  })

  if (!artist) notFound()

  const museumLocations = await prisma.museum.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
      artworks: { some: { artistId: artist.id, ...catalogueWhere } },
    },
    include: {
      _count: { select: { artworks: { where: { artistId: artist.id, ...catalogueWhere } } } },
      artworks: {
        take: 1,
        where: { artistId: artist.id, ...catalogueWhere, ...hasImage },
        select: { image_local_path: true, image_url: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const seenRecords = session?.user?.id
    ? await prisma.seen.findMany({
        where: {
          userId: session.user.id,
          artwork: { artistId: artist.id },
        },
        include: { artwork: { select: { museumId: true } } },
      })
    : []

  const seenMap = Object.fromEntries(seenRecords.map((s: { artworkId: number; [key: string]: unknown }) => [s.artworkId, s]))
  const seenByMuseum = seenRecords.reduce<Record<number, number>>((counts, seen) => {
    const museumId = seen.artwork.museumId
    if (museumId != null) counts[museumId] = (counts[museumId] ?? 0) + 1
    return counts
  }, {})

  const museumPins = museumLocations.map((museum) => ({
    id: museum.id,
    name: museum.name,
    city: museum.city,
    country: museum.country === 'Onbekend' || museum.country === 'Unknown'
      ? ''
      : tc.has(museum.country) ? tc(museum.country) : museum.country,
    lat: museum.lat as number,
    lng: museum.lng as number,
    artworkCount: museum._count.artworks,
    previewImage: proxyImg(museum.artworks[0]?.image_local_path ?? museum.artworks[0]?.image_url) ?? null,
    seenCount: seenByMuseum[museum.id] ?? 0,
  }))

  return (
    <ArtistDetailClient
      artist={localizeArtist(artist, locale)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seenMap={seenMap as any}
      isLoggedIn={!!session?.user}
      museumPins={museumPins}
    />
  )
}
