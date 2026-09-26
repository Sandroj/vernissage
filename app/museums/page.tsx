import { prisma, primaryCatalogue, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unstable_cache } from 'next/cache'
import MuseumsScreen from '@/components/museums-screen'

// Publieke catalogus-data — cachen scheelt een Turso-roundtrip per bezoeker.
// Alle werken (niet alleen de eerste) worden opgehaald zodat we per museum
// ook weten welke kunstenaars er hangen (voor het kunstenaarsfilter).
const getCachedMuseums = unstable_cache(
  () => {
    // Een werk telt mee bij zowel de eigenaar (museumId) als waar het nu
    // tijdelijk hangt (een actieve inkomende Loan) — zie loansTo hieronder.
    const currentLoan = { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }
    return prisma.museum.findMany({
      include: {
        artworks: {
          where: primaryCatalogue,
          select: { image_local_path: true, image_url: true, artistId: true },
          orderBy: { id: 'asc' },
        },
        loansTo: {
          where: { ...currentLoan, artwork: primaryCatalogue },
          select: { artwork: { select: { image_local_path: true, image_url: true, artistId: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
  },
  ['museums-list'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

const getCachedArtists = unstable_cache(
  () => prisma.artist.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ['museums-artists'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function MuseumsPage() {
  const [session, tc, allMuseums, artists] = await Promise.all([
    getServerSession(authOptions),
    getTranslations('Countries'),
    getCachedMuseums(),
    getCachedArtists(),
  ])

  // Filter op geldige coördinaten en minstens één werk (eigen collectie of bruikleen)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const museums = (allMuseums as any[]).filter(
    (m) => m.lat != null && m.lng != null && m.artworks.length + m.loansTo.length > 0
  )

  // Seen counts per museum — één query in plaats van één count-query per museum.
  const seenByMuseum: Record<number, number> = {}
  if (session?.user?.id) {
    const seenRows = await prisma.seen.findMany({
      where: { userId: session.user.id, artwork: { ...primaryCatalogue, museumId: { not: null } } },
      select: { artwork: { select: { museumId: true } } },
    })
    for (const row of seenRows) {
      const museumId = row.artwork.museumId as number
      seenByMuseum[museumId] = (seenByMuseum[museumId] ?? 0) + 1
    }
  }

  const pins = museums.map((m) => {
    const withImage = [...m.artworks, ...m.loansTo.map((l: { artwork: { image_local_path: string | null; image_url: string | null; artistId: number } }) => l.artwork)]
      .find((a) => a.image_local_path || a.image_url)
    const artistIds = new Set<number>([
      ...m.artworks.map((a: { artistId: number }) => a.artistId),
      ...m.loansTo.map((l: { artwork: { artistId: number } }) => l.artwork.artistId),
    ])
    return {
      id: m.id,
      name: m.name,
      city: m.city,
      country: m.country === 'Onbekend' ? '' : tc.has(m.country) ? tc(m.country) : m.country,
      lat: m.lat as number,
      lng: m.lng as number,
      artworkCount: m.artworks.length + m.loansTo.length,
      previewImage: withImage?.image_local_path ?? withImage?.image_url ?? null,
      seenCount: seenByMuseum[m.id] ?? 0,
      artistIds: Array.from(artistIds),
    }
  })

  return <MuseumsScreen museums={pins} artists={artists} />
}
