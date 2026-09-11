'use client'
import { useState, useMemo } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Search, ChevronDown } from 'lucide-react'

const PAGE_SIZE = 200

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  medium_raw?: string | null
  dimensions_raw?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { id: number; name: string; city: string } | null
  artist?: { name: string; slug: string } | null
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
  onRefresh?: (() => void) | undefined
}

function Dropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none bg-zinc-800 border border-white/10 text-zinc-300 text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-indigo-500/60 cursor-pointer transition-colors hover:bg-zinc-700 hover:border-white/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  )
}

export default function ArtworkGrid({ artworks, seenMap, isLoggedIn, onRefresh }: ArtworkGridProps) {
  const [filterTitle, setFilterTitle] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('all')
  const [filterMuseum, setFilterMuseum] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Only artworks with an image
  const withImage = useMemo(
    () => artworks.filter((a) => a.image_url || a.image_local_path),
    [artworks]
  )

  // Unique types
  const types = useMemo(() => {
    const set = new Set(withImage.map((a) => a.type_normalized).filter(Boolean))
    return Array.from(set) as string[]
  }, [withImage])

  // Unique museums
  const museums = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of withImage) {
      if (a.museum) map.set(a.museum.id, a.museum.name)
    }
    return Array.from(map.entries())
  }, [withImage])

  const filtered = useMemo(() => withImage.filter((a) => {
    if (filterTitle && !a.title.toLowerCase().includes(filterTitle.toLowerCase())) return false
    if (filterType !== 'all' && a.type_normalized !== filterType) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    if (filterMuseum !== 'all' && (!a.museum || a.museum.id.toString() !== filterMuseum)) return false
    return true
  }), [withImage, filterTitle, filterType, filterSeen, filterMuseum, seenMap])

  // Reset pagination when filters change
  const visible = filtered.slice(0, visibleCount)

  const seenCount = Object.keys(seenMap).length

  const seenOptions: { value: 'all' | 'seen' | 'unseen'; label: string }[] = [
    { value: 'all', label: 'Alle werken' },
    { value: 'seen', label: 'Gezien' },
    { value: 'unseen', label: 'Niet gezien' },
  ]

  const typeOptions = [
    { value: 'all', label: 'Alle types' },
    ...types.map((t) => ({ value: t, label: t })),
  ]

  const museumOptions = [
    { value: 'all', label: 'Alle musea' },
    ...museums.slice(0, 12).map(([id, name]) => ({ value: id.toString(), label: name.length > 30 ? name.substring(0, 28) + '…' : name })),
  ]

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setVisibleCount(PAGE_SIZE) }
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{withImage.length} werken</span>
          {seenCount > 0 && (
            <span className="text-indigo-400 font-medium">{seenCount} gezien</span>
          )}
        </div>
        <span className="text-xs text-slate-500">{filtered.length} zichtbaar</span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={filterTitle}
            onChange={(e) => { setFilterTitle(e.target.value); setVisibleCount(PAGE_SIZE) }}
            placeholder="Zoek op titel…"
            className="w-full bg-zinc-800 border border-white/10 text-zinc-300 placeholder:text-zinc-600 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Dropdown value={filterSeen} onChange={handleFilterChange(setFilterSeen)} options={seenOptions} />
          {types.length > 1 && (
            <Dropdown value={filterType} onChange={handleFilterChange(setFilterType)} options={typeOptions} />
          )}
          {museums.length > 1 && (
            <Dropdown value={filterMuseum} onChange={handleFilterChange(setFilterMuseum)} options={museumOptions} />
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {visible.map((artwork) => (
          <ArtworkCard
            key={artwork.id}
            artwork={artwork}
            seen={seenMap[artwork.id] ?? null}
            onSeenChange={onRefresh ?? (() => {})}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p>Geen werken gevonden met deze filters.</p>
        </div>
      )}

      {/* Toon meer */}
      {visibleCount < filtered.length && (
        <div className="text-center pt-4">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="px-6 py-2 text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg transition-colors"
          >
            Toon meer ({visibleCount} van {filtered.length})
          </button>
        </div>
      )}
    </div>
  )
}
