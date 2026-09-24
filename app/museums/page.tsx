import { prisma, hasImage, primaryCatalogue, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { getTranslations, getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dynamic from 'next/dynamic'
import { unstable_cache } from 'next/cache'

// Leaflet werkt alleen client-side — geen SSR
const MuseumMap = dynamic(() => import('@/components/museum-map'), {
  ssr: false,
  loading: () => (
    <div className="flex w-full items-center justify-center rounded-[1.5rem] bg-[#e7e1d6] ring-1 ring-black/5" style={{ height: '70vh', minHeight: 500 }}>
      <div className="text-sm text-stone-500">Kaart laden…</div>
    </div>
  ),
})

// Publieke catalogus-data — cachen scheelt een Turso-roundtrip per bezoeker.
const getCachedMuseums = unstable_cache(
  () => {
    // Een werk telt mee bij zowel de eigenaar (museumId) als waar het nu
    // tijdelijk hangt (een actieve inkomende Loan) — zie loansTo hieronder.
    const currentLoan = { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }
    return prisma.museum.findMany({
      include: {
        _count: { select: { artworks: { where: primaryCatalogue } } },
        artworks: {
          take: 1,
          where: { AND: [primaryCatalogue, hasImage] },
          select: { image_local_path: true, image_url: true },
          orderBy: { id: 'asc' },
        },
        loansTo: {
          where: { ...currentLoan, artwork: primaryCatalogue },
          select: { artwork: { select: { image_local_path: true, image_url: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })
  },
  ['museums-list'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function MuseumsPage() {
  const [session, t, tc, locale, allMuseums] = await Promise.all([
    getServerSession(authOptions),
    getTranslations('Museums'),
    getTranslations('Countries'),
    getLocale(),
    getCachedMuseums(),
  ])

  // Filter op geldige coördinaten en minstens één werk (eigen collectie of bruikleen)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const museums = (allMuseums as any[]).filter(
    (m) => m.lat != null && m.lng != null && m._count.artworks + m.loansTo.length > 0
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalArtworks = museums.reduce((sum: number, m: any) => sum + m._count.artworks + m.loansTo.length, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pins = museums.map((m: any) => ({
    id: m.id,
    name: m.name,
    city: m.city,
    country: m.country === 'Onbekend' ? '' : tc.has(m.country) ? tc(m.country) : m.country,
    lat: m.lat as number,
    lng: m.lng as number,
    artworkCount: m._count.artworks + m.loansTo.length,
    previewImage:
      m.artworks[0]?.image_local_path ?? m.artworks[0]?.image_url
      ?? m.loansTo[0]?.artwork?.image_local_path ?? m.loansTo[0]?.artwork?.image_url
      ?? null,
    seenCount: seenByMuseum[m.id] ?? 0,
  }))
  const popupLabels = { works: t('works'), seen: t('seen'), openMuseum: t('openMuseum') }

  return (
    <div>
      <div className="mb-7 max-w-3xl">
        <p className="eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display text-5xl font-medium tracking-tight text-stone-900 sm:text-6xl">{t('title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">
          {t('subtitle', { locations: museums.length, works: totalArtworks.toLocaleString(locale) })}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">{t('disclaimer')}</p>
      </div>

      {/* Kaart */}
      <MuseumMap museums={pins} labels={popupLabels} />

      <p className="mt-4 text-xs text-stone-400">{t('legendHint')}</p>
    </div>
  )
}
