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
    <div className="flex w-full items-center justify-center rounded-[1.5rem] bg-[#e7e1d6] ring-1 ring-black/5" style={{ height: '70vh', minHeight: 500 }}>
      <div className="text-sm text-stone-500">Kaart laden…</div>
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
      _count: { select: { artworks: true } },
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

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-[3px] border-[#fffaf0] bg-[#e7e1d6] shadow-sm" />
          <span>{t('legendMuseum')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-[3px] border-[#4256cc] bg-[#e7e1d6] shadow-sm" />
          <span>{t('legendSeen')}</span>
        </div>
        <span className="text-stone-400">{t('legendHint')}</span>
      </div>
    </div>
  )
}
