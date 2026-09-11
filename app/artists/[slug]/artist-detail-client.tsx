'use client'
import { useState } from 'react'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'
import { useTranslations } from 'next-intl'
import { ArrowDown } from 'lucide-react'
import { proxyImg } from '@/lib/utils'

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
}

export default function ArtistDetailClient({ artist, seenMap: initialSeenMap, isLoggedIn }: ArtistDetailClientProps) {
  const [seenMap, setSeenMap] = useState(initialSeenMap)
  const t = useTranslations('Artists')

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
                <div>
                  <span className="text-2xl font-bold text-[#f4b548]">{seenCount}</span><span className="ml-1.5 text-white/45">{t('seen')}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {artist.bio && (
              <p className="mt-5 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/60">{artist.bio}</p>
            )}
          </div>
          <a href="#works" className="absolute bottom-0 right-0 hidden size-12 place-items-center rounded-full border border-white/15 bg-white/8 text-white/70 transition hover:bg-white/15 sm:grid"><ArrowDown size={18} /></a>
        </div>
      </div>

      {/* Werkenraster */}
      <div id="works"><ArtworkGrid
        artworks={artist.artworks.map((a) => ({
          ...a,
          artist: { name: artist.name, slug: artist.slug },
        }))}
        seenMap={seenMap}
        isLoggedIn={isLoggedIn}
        onRefresh={refresh}
      /></div>
    </div>
  )
}
