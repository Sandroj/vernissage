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
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
            {artist.portrait_url ? (
              <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                {artist.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">{artist.name}</h1>
            <p className="text-slate-400 text-sm mb-3">
              {[artist.nationality, artist.birth_year && artist.death_year
                ? `${artist.birth_year}–${artist.death_year}`
                : artist.birth_year ? `geb. ${artist.birth_year}` : null
              ].filter(Boolean).join(' · ')}
            </p>
            <ProgressBar
              value={pct}
              seen={seenCount}
              total={total}
              animate={true}
              className="max-w-md"
            />
            {artist.bio && (
              <p className="text-slate-300 text-sm mt-3 leading-relaxed line-clamp-3">{artist.bio}</p>
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
