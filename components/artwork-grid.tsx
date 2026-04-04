'use client'
import { useState } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Button } from '@/components/ui/button'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
}

interface SeenRecord {
  id: number
  artworkId: number
  dateSeen: string
  locationSeen?: string | null
  notes?: string | null
  rating?: number | null
  photo_url?: string | null
}

interface ArtworkGridProps {
  artworks: Artwork[]
  seenMap: Record<number, SeenRecord>
  isLoggedIn: boolean
  onRefresh: () => void
}

const TYPES = ['Alle types', 'painting', 'drawing', 'print', 'work on paper', 'other']

export default function ArtworkGrid({ artworks, seenMap, isLoggedIn, onRefresh }: ArtworkGridProps) {
  const [filterType, setFilterType] = useState('Alle types')
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('all')

  const filtered = artworks.filter((a) => {
    if (filterType !== 'Alle types' && a.type_normalized !== filterType) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    return true
  })

  return (
    <div>
      {/* Filterbalk */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filterType === t ? 'default' : 'outline'}
            onClick={() => setFilterType(t)}
            className="text-xs"
          >
            {t}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all', 'seen', 'unseen'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filterSeen === f ? 'default' : 'outline'}
              onClick={() => setFilterSeen(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Alle' : f === 'seen' ? 'Gezien' : 'Niet gezien'}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map((artwork) => (
          <ArtworkCard
            key={artwork.id}
            artwork={artwork}
            seen={seenMap[artwork.id] ?? null}
            onSeenChange={onRefresh}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-slate-400 text-center py-12">Geen werken gevonden met deze filters.</p>
      )}
    </div>
  )
}
