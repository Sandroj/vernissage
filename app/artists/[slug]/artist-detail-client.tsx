'use client'
import { useState } from 'react'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'

interface ArtworkWithMuseum {
  id: number
  title: string
  year_start?: number | null
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

  const seenCount = Object.keys(seenMap).length
  const total = artist.artworks.length
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  const years = artist.birth_year
    ? artist.death_year
      ? `${artist.birth_year} – ${artist.death_year}`
      : `Geboren ${artist.birth_year}`
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
    <div>
      {/* Artist hero */}
      <div className="relative mb-10 bg-gradient-to-b from-zinc-900/80 to-transparent rounded-2xl p-6 sm:p-8 border border-white/5">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Portrait */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-800 overflow-hidden flex-shrink-0 ring-1 ring-white/10">
            {artist.portrait_url ? (
              <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-600">
                {artist.name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-1">{artist.name}</h1>
            {(artist.nationality || years) && (
              <p className="text-zinc-400 text-sm mb-4">
                {[artist.nationality, years].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Progress */}
            <div className="max-w-sm mb-4">
              <ProgressBar value={pct} seen={seenCount} total={total} animate={true} />
            </div>

            {/* Stats row */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-2xl font-bold text-white">{total}</span>
                <span className="text-zinc-500 ml-1.5">werken</span>
              </div>
              {seenCount > 0 && (
                <div>
                  <span className="text-2xl font-bold text-indigo-400">{seenCount}</span>
                  <span className="text-zinc-500 ml-1.5">gezien</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {artist.bio && (
              <p className="text-zinc-400 text-sm mt-4 leading-relaxed max-w-2xl line-clamp-3">{artist.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Werkenraster */}
      <ArtworkGrid
        artworks={artist.artworks}
        seenMap={seenMap}
        isLoggedIn={isLoggedIn}
        onRefresh={refresh}
      />
    </div>
  )
}
