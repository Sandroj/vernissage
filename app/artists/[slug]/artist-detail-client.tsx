'use client'
import { useState } from 'react'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'
import { useTranslations } from 'next-intl'
import { ArrowDown, MapPin } from 'lucide-react'
import { proxyImg } from '@/lib/utils'
import MuseumMap, { type MuseumPin } from '@/components/museum-map'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ArtworkWithMuseum {
  id: number
  title: string
  year_start?: number | null
  medium_raw?: string | null
  dimensions_raw?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { id: number; name: string; city: string } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface Artist {
  id: number
  name: string
  slug: string
  birth_year?: number | null
  death_year?: number | null
  nationality?: string | null
  bio?: string | null
  portrait_url?: string | null
  artworks: ArtworkWithMuseum[]
}

interface ArtistDetailClientProps {
  artist: Artist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seenMap: Record<number, any>
  isLoggedIn: boolean
  museumPins: MuseumPin[]
}

export default function ArtistDetailClient({ artist, seenMap: initialSeenMap, isLoggedIn, museumPins }: ArtistDetailClientProps) {
  const [seenMap, setSeenMap] = useState(initialSeenMap)
  const [mapOpen, setMapOpen] = useState(false)
  const [seenFilter, setSeenFilter] = useState<'all' | 'seen' | 'unseen'>('all')
  const t = useTranslations('Artists')

  function showSeenWorks() {
    setSeenFilter('seen')
    document.getElementById('works')?.scrollIntoView({ behavior: 'smooth' })
  }

  const seenCount = Object.keys(seenMap).length
  const total = artist.artworks.length
  const pct = total > 0 ? (seenCount / total) * 100 : 0
  const cover = proxyImg(artist.artworks.find((a) => a.image_url || a.image_local_path)?.image_local_path ?? artist.artworks.find((a) => a.image_url || a.image_local_path)?.image_url)

  const years = artist.birth_year
    ? artist.death_year
      ? `${artist.birth_year} – ${artist.death_year}`
      : t('bornLong', { year: artist.birth_year })
    : null

  async function refresh() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: Record<number, any> = {}
      for (const s of all) {
        if (artist.artworks.some((a) => a.id === s.artworkId)) {
          map[s.artworkId] = s
        }
      }
      setSeenMap(map)
    }
  }

  return (
    <div className="pb-12">
      {/* Artist hero */}
      <div className="relative mb-10 min-h-[430px] overflow-hidden rounded-[2rem] bg-[#25231f] p-6 text-white sm:p-9 lg:p-12">
        {cover && <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-25 blur-[1px]" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#24211d] via-[#24211d]/88 to-[#24211d]/30" />
        <div className="relative flex min-h-[350px] flex-col justify-end gap-7 sm:flex-row sm:items-end sm:justify-start">
          {/* Portrait */}
          <div className="size-28 shrink-0 overflow-hidden rounded-[1.4rem] bg-white/10 ring-1 ring-white/20 sm:size-36">
            {artist.portrait_url ? (
              <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center font-display text-5xl font-bold text-white/40">
                {artist.name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#f4b548]">{t('collection')}</p>
            <h1 className="font-display mb-2 text-5xl font-medium leading-none text-[#fffaf0] sm:text-7xl">{artist.name}</h1>
            {(artist.nationality || years) && (
              <p className="mb-5 text-sm text-white/55">
                {[artist.nationality, years].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Progress */}
            <div className="mb-5 max-w-md [&_span]:text-white/65">
              <ProgressBar value={pct} seen={seenCount} total={total} animate={true} />
            </div>

            {/* Stats row */}
            <div className="flex gap-7 text-sm">
              <div>
                <span className="text-2xl font-bold text-white">{total}</span><span className="ml-1.5 text-white/45">{t('works')}</span>
              </div>
              {seenCount > 0 && (
                <button
                  type="button"
                  onClick={showSeenWorks}
                  className="rounded-md transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4b548]"
                >
                  <span className="text-2xl font-bold text-[#f4b548]">{seenCount}</span><span className="ml-1.5 text-white/45 underline decoration-white/25 underline-offset-4">{t('seen')}</span>
                </button>
              )}
            </div>

            {museumPins.length > 0 && (
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mapOpen}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/18"
              >
                <MapPin size={16} className="text-[#f4b548]" />
                {t('mapButton', { count: museumPins.length })}
              </button>
            )}

            {/* Bio */}
            {artist.bio && (
              <p className="mt-5 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/60">{artist.bio}</p>
            )}
          </div>
          <a href="#works" className="absolute bottom-0 right-0 hidden size-12 place-items-center rounded-full border border-white/15 bg-white/8 text-white/70 transition hover:bg-white/15 sm:grid"><ArrowDown size={18} /></a>
        </div>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-[1.75rem] bg-[#fffaf0] p-3 text-stone-900 sm:max-w-5xl sm:p-5">
          <DialogHeader className="px-2 pb-1 pr-10">
            <DialogTitle className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {t('mapTitle', { name: artist.name })}
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-xs leading-relaxed text-stone-500 sm:text-sm">
              {t('mapDescription', { count: museumPins.length })}
            </DialogDescription>
          </DialogHeader>
          {mapOpen && (
            <MuseumMap
              museums={museumPins}
              labels={{ works: t('works'), seen: t('seen'), openMuseum: t('openMuseum') }}
              compact
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Werkenraster */}
      <div id="works"><ArtworkGrid
        artworks={artist.artworks.map((a) => ({
          ...a,
          artist: { name: artist.name, slug: artist.slug },
        }))}
        seenMap={seenMap}
        isLoggedIn={isLoggedIn}
        onRefresh={refresh}
        seenFilter={seenFilter}
        onSeenFilterChange={setSeenFilter}
      /></div>
    </div>
  )
}
