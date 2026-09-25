import { prisma, hasImage, localizeArtist, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { currentLoan, catalogueWhereForSlug, artworkListSelect, artworkListOrderBy, INITIAL_ARTWORKS_TAKE } from '@/lib/artist-catalogue'
import { getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtistDetailClient from './artist-detail-client'
import { getTranslations } from 'next-intl/server'
import { signPhotoUrls } from '@/lib/photo-storage'
import { unstable_cache } from 'next/cache'

// Artiestdata en museumlocaties zijn publieke catalogus-data — cachen scheelt
// twee Turso-roundtrips per bezoeker. Beide matchen op de slug/catalogue-
// filter i.p.v. artist.id, zodat ze niet op elkaar hoeven te wachten.
const getCachedArtist = unstable_cache(
  (slug: string) => {
    const catalogueWhere = catalogueWhereForSlug(slug)
    return prisma.artist.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        birth_year: true,
        death_year: true,
        nationality: true,
        nationality_en: true,
        bio: true,
        bio_en: true,
        portrait_url: true,
        // Eerste page (zelfde grootte als ArtworkGrid's client-side PAGE_SIZE)
        // — bij Monet/Van Gogh (2000+ werken) domineert het aantal
        // geserialiseerde objecten de laadtijd, niet de payload per object
        // (gemeten: 2013 werken ≈1s, 200 werken ≈0,09s warm). De rest komt
        // via app/api/artists/[slug]/artworks/route.ts binnen zodra de
        // pagina geladen is — zie artist-detail-client.tsx.
        artworks: {
          where: catalogueWhere,
          take: INITIAL_ARTWORKS_TAKE,
          select: artworkListSelect,
          orderBy: artworkListOrderBy,
        },
        _count: { select: { artworks: { where: catalogueWhere } } },
      },
    })
  },
  ['artist-detail'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

const getCachedMuseumLocations = unstable_cache(
  (slug: string) => {
    const catalogueWhere = catalogueWhereForSlug(slug)
    // Een werk telt mee bij zowel de eigenaar (museumId) als waar het nu
    // tijdelijk hangt (een actieve inkomende Loan) — zie loansTo hieronder.
    const artistLoanWhere = { ...currentLoan, artwork: { artist: { slug }, ...catalogueWhere } }
    return prisma.museum.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        OR: [
          { artworks: { some: { artist: { slug }, ...catalogueWhere } } },
          { loansTo: { some: artistLoanWhere } },
        ],
      },
      include: {
        _count: { select: { artworks: { where: { artist: { slug }, ...catalogueWhere } } } },
        artworks: {
          take: 1,
          where: { artist: { slug }, ...catalogueWhere, ...hasImage },
          select: { image_local_path: true, image_url: true },
          orderBy: { id: 'asc' },
        },
        loansTo: {
          where: artistLoanWhere,
          select: { artwork: { select: { image_local_path: true, image_url: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
  },
  ['artist-museum-locations'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function ArtistDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const catalogueWhere = catalogueWhereForSlug(params.slug)

  const [session, locale, tc] = await Promise.all([
    getServerSession(authOptions),
    getLocale(),
    getTranslations('Countries'),
  ])

  // Alle drie onafhankelijk van elkaar (museumLocations/seenRecords matchen
  // op slug, niet op artist.id) — dus in één keer parallel opvragen.
  const [artist, museumLocations, seenRecordsRaw] = await Promise.all([
    getCachedArtist(params.slug),
    getCachedMuseumLocations(params.slug),
    session?.user?.id
      ? prisma.seen.findMany({
          where: {
            userId: session.user.id,
            artwork: { artist: { slug: params.slug }, ...catalogueWhere },
          },
          select: {
            id: true,
            artworkId: true,
            dateSeen: true,
            dateApprox: true,
            locationSeen: true,
            notes: true,
            rating: true,
            photo_url: true,
            artwork: { select: { museumId: true } },
          },
        })
      : Promise.resolve([]),
  ])

  if (!artist) notFound()

  const seenRecords = await signPhotoUrls(seenRecordsRaw)

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
    artworkCount: museum._count.artworks + museum.loansTo.length,
    previewImage:
      museum.artworks[0]?.image_local_path ?? museum.artworks[0]?.image_url
      ?? museum.loansTo[0]?.artwork?.image_local_path ?? museum.loansTo[0]?.artwork?.image_url
      ?? null,
    seenCount: seenByMuseum[museum.id] ?? 0,
  }))

  return (
    <ArtistDetailClient
      artist={localizeArtist(artist, locale)}
      totalWorks={artist._count.artworks}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seenMap={seenMap as any}
      isLoggedIn={!!session?.user}
      museumPins={museumPins}
    />
  )
}
