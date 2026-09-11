'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Globe } from 'lucide-react'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'
import { useTranslations } from 'next-intl'

interface ArtworkWithArtist {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  medium_raw?: string | null
  dimensions_raw?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { id: number; name: string; city: string } | null
  artist: { id: number; name: string; slug: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface Museum {
  id: number
  name: string
  city: string
  country: string
  website?: string | null
  artworks: ArtworkWithArtist[]
}

interface ArtistSummary {
  name: string
  slug: string
  count: number
}

interface MuseumDetailClientProps {
  museum: Museum
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seenMap: Record<number, any>
  isLoggedIn: boolean
  artists: ArtistSummary[]
}

export default function MuseumDetailClient({ museum, seenMap: initialSeenMap, isLoggedIn, artists }: MuseumDetailClientProps) {
  const [seenMap, setSeenMap] = useState(initialSeenMap)
  const t = useTranslations('Museums')

  const seenCount = Object.keys(seenMap).length
  const total = museum.artworks.length
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  async function refresh() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: Record<number, any> = {}
      for (const s of all) {
        if (museum.artworks.some((a) => a.id === s.artworkId)) {
          map[s.artworkId] = s
        }
      }
      setSeenMap(map)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-10 bg-gradient-to-b from-zinc-900/80 to-transparent rounded-2xl p-6 sm:p-8 border border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
            <Building2 size={24} className="text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{museum.name}</h1>
            <p className="text-zinc-500 text-sm mb-4">
              {museum.city}{museum.country ? `, ${museum.country}` : ''}
              {museum.website && (
                <>
                  {' · '}
                  <a
                    href={museum.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Globe size={11} /> {t('website')}
                  </a>
                </>
              )}
            </p>

            {/* Progress */}
            <div className="max-w-sm mb-4">
              <ProgressBar value={pct} seen={seenCount} total={total} animate />
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-2xl font-bold text-white">{total}</span>
                <span className="text-zinc-500 ml-1.5">{t('works')}</span>
              </div>
              {seenCount > 0 && (
                <div>
                  <span className="text-2xl font-bold text-indigo-400">{seenCount}</span>
                  <span className="text-zinc-500 ml-1.5">{t('seen')}</span>
                </div>
              )}
            </div>

            {/* Kunstenaars */}
            {artists.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {artists.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/artists/${a.slug}`}
                    className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs px-2.5 py-1 rounded-full transition-colors"
                  >
                    {a.name}
                    <span className="text-zinc-500 ml-0.5">{a.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <ArtworkGrid
        artworks={museum.artworks}
        seenMap={seenMap}
        isLoggedIn={isLoggedIn}
        onRefresh={refresh}
      />
    </div>
  )
}
