'use client'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import type { MuseumPin } from '@/components/museum-map'

const MuseumMap = dynamic(() => import('@/components/museum-map'), {
  ssr: false,
  loading: () => (
    <div className="flex w-full items-center justify-center rounded-[1.5rem] bg-[#e7e1d6] ring-1 ring-black/5" style={{ height: '70vh', minHeight: 500 }}>
      <div className="text-sm text-stone-500">Kaart laden…</div>
    </div>
  ),
})

interface MuseumPinWithArtists extends MuseumPin {
  artistIds: number[]
}

export default function MuseumsScreen({
  museums,
  artists,
}: {
  museums: MuseumPinWithArtists[]
  artists: { id: number; name: string }[]
}) {
  const t = useTranslations('Museums')
  const locale = useLocale()
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<number>>(new Set())

  function toggleArtist(id: number) {
    setSelectedArtistIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    if (selectedArtistIds.size === 0) return museums
    return museums.filter((m) => m.artistIds.some((id) => selectedArtistIds.has(id)))
  }, [museums, selectedArtistIds])

  const totalArtworks = filtered.reduce((sum, m) => sum + m.artworkCount, 0)
  const popupLabels = { works: t('works'), seen: t('seen'), openMuseum: t('openMuseum') }

  return (
    <div>
      <div className="mb-7 max-w-3xl">
        <p className="eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display text-5xl font-medium tracking-tight text-stone-900 sm:text-6xl">{t('title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">
          {t('subtitle', { locations: filtered.length, works: totalArtworks.toLocaleString(locale) })}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">{t('disclaimer')}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedArtistIds(new Set())}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
            selectedArtistIds.size === 0 ? 'bg-[#4256cc] text-white' : 'bg-black/5 text-stone-600 hover:bg-black/10'
          )}
        >
          {t('filterAllArtists')}
        </button>
        {artists.map((artist) => (
          <button
            key={artist.id}
            onClick={() => toggleArtist(artist.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              selectedArtistIds.has(artist.id) ? 'bg-[#4256cc] text-white' : 'bg-black/5 text-stone-600 hover:bg-black/10'
            )}
          >
            {artist.name}
          </button>
        ))}
      </div>

      <MuseumMap museums={filtered} labels={popupLabels} />

      <p className="mt-4 text-xs text-stone-400">{t('legendHint')}</p>
    </div>
  )
}
