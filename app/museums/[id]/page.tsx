import { prisma, primaryCatalogue, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MuseumDetailClient from './museum-detail-client'
import { getTranslations } from 'next-intl/server'
import { signPhotoUrls } from '@/lib/photo-storage'
import { unstable_cache } from 'next/cache'

// Publieke catalogus-data — cachen scheelt een Turso-roundtrip per bezoeker.
const getCachedMuseum = unstable_cache(
  (museumId: number) =>
    prisma.museum.findUnique({
      where: { id: museumId },
      include: {
        artworks: {
          where: primaryCatalogue,
          include: { artist: { select: { id: true, name: true, slug: true } }, loans: { where: { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }, include: { toMuseum: true } } },
          orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
        },
        loansTo: { where: { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }, include: { artwork: { include: { artist: { select: { id: true, name: true, slug: true } }, museum: true } }, fromMuseum: true } },
      },
    }),
  ['museum-detail'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function MuseumDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const museumId = Number(params.id)
  if (isNaN(museumId)) notFound()

  // seenRecords hangt alleen af van museumId (param) en session.user.id, niet
  // van het museum-object zelf — dus alles in één keer parallel opvragen.
  const [session, t, museum] = await Promise.all([
    getServerSession(authOptions),
    getTranslations('Museums'),
    getCachedMuseum(museumId),
  ])

  if (!museum) notFound()

  // Grid toont zowel eigen werken als inkomende bruiklenen (artwork.museumId
  // wijst dan naar het thuismuseum, niet dit museum) — seen-status moet op
  // artworkId matchen, niet op museumId, anders mist een geleend werk altijd.
  const gridArtworkIds = [...museum.artworks, ...museum.loansTo.map((loan) => loan.artwork)].map((a) => a.id)

  const seenRecords = session?.user?.id
    ? await signPhotoUrls(
        await prisma.seen.findMany({
          where: {
            userId: session.user.id,
            artworkId: { in: gridArtworkIds },
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
          },
        })
      )
    : []

  const seenMap = Object.fromEntries(seenRecords.map((s) => [s.artworkId, s]))

  // Unieke kunstenaars gesorteerd op aantal werken
  const artistMap = new Map<number, { name: string; slug: string; count: number }>()
  for (const a of museum.artworks) {
    if (!artistMap.has(a.artist.id)) {
      artistMap.set(a.artist.id, { name: a.artist.name, slug: a.artist.slug, count: 0 })
    }
    artistMap.get(a.artist.id)!.count++
  }
  const artists = Array.from(artistMap.values()).sort((a, b) => b.count - a.count)

  return (
    <div>
      {/* Back */}
      <Link
        href="/museums"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#4256cc]"
      >
        <ArrowLeft size={14} /> {t('backToMuseums')}
      </Link>

      <MuseumDetailClient
        museum={museum}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seenMap={seenMap as any}
        isLoggedIn={!!session?.user}
        artists={artists}
        incomingLoans={museum.loansTo}
      />
    </div>
  )
}
