import { prisma, hasImage } from '@/lib/prisma'
import { proxyImg } from '@/lib/utils'
import { getTranslations, getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dynamic from 'next/dynamic'

// Leaflet werkt alleen client-side — geen SSR
const MuseumMap = dynamic(() => import('@/components/museum-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center" style={{ height: '70vh', minHeight: 500 }}>
      <div className="text-zinc-600 text-sm">Kaart laden…</div>
    </div>
  ),
})

export default async function MuseumsPage() {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('Museums')
  const tc = await getTranslations('Countries')
  const locale = await getLocale()

  // Haal alle musea op — filter daarna in JS op coördinaten + artworks
  const allMuseums = await prisma.museum.findMany({
    include: {
      _count: { select: { artworks: { where: hasImage } } },
      artworks: {
        take: 1,
        where: hasImage,
        select: { image_local_path: true, image_url: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Filter op geldige coördinaten en minstens één werk
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const museums = (allMuseums as any[]).filter(
    (m) => m.lat != null && m.lng != null && m._count.artworks > 0
  )

  // Seen counts per museum
  const seenByMuseum: Record<number, number> = {}
  if (session?.user?.id) {
    for (const museum of museums) {
      const count = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { museumId: museum.id } },
      })
      seenByMuseum[museum.id] = count
    }
  }

  const totalArtworks = museums.reduce((sum: number, m: { _count: { artworks: number } }) => sum + m._count.artworks, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pins = museums.map((m: any) => ({
    id: m.id,
    name: m.name,
    city: m.city,
    country: m.country === 'Onbekend' ? '' : tc.has(m.country) ? tc(m.country) : m.country,
    lat: m.lat as number,
    lng: m.lng as number,
    artworkCount: m._count.artworks,
    previewImage: proxyImg(m.artworks[0]?.image_local_path ?? m.artworks[0]?.image_url) ?? null,
    seenCount: seenByMuseum[m.id] ?? 0,
  }))
  const popupLabels = { works: t('works'), seen: t('seen') }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">{t('title')}</h1>
        <p className="text-zinc-500 text-sm">
          {t('subtitle', { locations: museums.length, works: totalArtworks.toLocaleString(locale) })}
        </p>
      </div>

      {/* Kaart */}
      <MuseumMap museums={pins} labels={popupLabels} />

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-white/25 bg-zinc-800" />
          <span>{t('legendMuseum')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-indigo-500 bg-zinc-800" />
          <span>{t('legendSeen')}</span>
        </div>
        <span className="text-zinc-600">{t('legendHint')}</span>
      </div>
    </div>
  )
}
