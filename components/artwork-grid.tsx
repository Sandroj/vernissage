'use client'
import { useState, useMemo } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { cn } from '@/lib/utils'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { id: number; name: string; city: string } | null
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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
      )}
    >
      {children}
    </button>
  )
}

export default function ArtworkGrid({ artworks, seenMap, isLoggedIn, onRefresh }: ArtworkGridProps) {
  const [filterType, setFilterType] = useState('all')
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('all')
  const [filterMuseum, setFilterMuseum] = useState('all')

  // Get unique types from artworks
  const types = useMemo(() => {
    const set = new Set(artworks.map(a => a.type_normalized).filter(Boolean))
    return Array.from(set) as string[]
  }, [artworks])

  // Get unique museums
  const museums = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of artworks) {
      if (a.museum) map.set(a.museum.id, `${a.museum.name}, ${a.museum.city}`)
    }
    return Array.from(map.entries())
  }, [artworks])

  const filtered = artworks.filter((a) => {
    if (filterType !== 'all' && a.type_normalized !== filterType) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    if (filterMuseum !== 'all' && (!a.museum || a.museum.id.toString() !== filterMuseum)) return false
    return true
  })

  const seenCount = Object.keys(seenMap).length

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{artworks.length} werken</span>
          {seenCount > 0 && (
            <span className="text-indigo-400 font-medium">{seenCount} gezien</span>
          )}
        </div>
        <span className="text-xs text-slate-500">{filtered.length} zichtbaar</span>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Seen filter */}
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filterSeen === 'all'} onClick={() => setFilterSeen('all')}>Alle</FilterButton>
          <FilterButton active={filterSeen === 'seen'} onClick={() => setFilterSeen('seen')}>Gezien</FilterButton>
          <FilterButton active={filterSeen === 'unseen'} onClick={() => setFilterSeen('unseen')}>Niet gezien</FilterButton>
        </div>

        {/* Type filter */}
        {types.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <FilterButton active={filterType === 'all'} onClick={() => setFilterType('all')}>Alle types</FilterButton>
            {types.map((t) => (
              <FilterButton key={t} active={filterType === t} onClick={() => setFilterType(t)}>{t}</FilterButton>
            ))}
          </div>
        )}

        {/* Museum filter */}
        {museums.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 mr-1">Museum:</span>
            <FilterButton active={filterMuseum === 'all'} onClick={() => setFilterMuseum('all')}>Alle</FilterButton>
            {museums.slice(0, 8).map(([id, name]) => (
              <FilterButton key={id} active={filterMuseum === id.toString()} onClick={() => setFilterMuseum(id.toString())}>
                {name.split(',')[0]}
              </FilterButton>
            ))}
          </div>
        )}
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
        <div className="text-center py-16 text-slate-500">
          <p>Geen werken gevonden met deze filters.</p>
        </div>
      )}
    </div>
  )
}
