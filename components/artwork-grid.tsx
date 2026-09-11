'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Search, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const PAGE_SIZE = 200

const TYPE_ORDER = ['painting', 'drawing', 'watercolor', 'work on paper', 'print']

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
  const t = useTranslations('Grid')
  const [filterTitle, setFilterTitle] = useState('')
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('all')
  const [filterMuseum, setFilterMuseum] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Only artworks with an image
  const withImage = useMemo(
    () => artworks.filter((a) => a.image_url || a.image_local_path),
    [artworks]
  )

  // Unique types, in vaste volgorde, met aantallen
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of withImage) {
      if (a.type_normalized) counts.set(a.type_normalized, (counts.get(a.type_normalized) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort(
      ([a], [b]) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99)
    )
  }, [withImage])

  function toggleType(ty: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(ty)) next.delete(ty); else next.add(ty)
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }

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
    if (a.type_normalized && hiddenTypes.has(a.type_normalized)) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    if (filterMuseum !== 'all' && (!a.museum || a.museum.id.toString() !== filterMuseum)) return false
    return true
  }), [withImage, filterTitle, hiddenTypes, filterSeen, filterMuseum, seenMap])

  // Reset pagination when filters change
  const visible = filtered.slice(0, visibleCount)

  // Automatisch meer laden bij scrollen voorbij het zichtbare aantal
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((n) => n + PAGE_SIZE)
      }
    }, { rootMargin: '600px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible.length])

  const seenCount = Object.keys(seenMap).length

  const seenOptions: { value: 'all' | 'seen' | 'unseen'; label: string }[] = [
    { value: 'all', label: t('allWorks') },
    { value: 'seen', label: t('seenOnly') },
    { value: 'unseen', label: t('unseenOnly') },
  ]

  const museumOptions = [
    { value: 'all', label: t('allMuseums') },
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
          <span>{t('works', { count: withImage.length })}</span>
          {seenCount > 0 && (
            <span className="text-indigo-400 font-medium">{t('seen', { count: seenCount })}</span>
          )}
        </div>
        <span className="text-xs text-slate-500">{t('visible', { count: filtered.length })}</span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={filterTitle}
            onChange={(e) => { setFilterTitle(e.target.value); setVisibleCount(PAGE_SIZE) }}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-zinc-800 border border-white/10 text-zinc-300 placeholder:text-zinc-600 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown value={filterSeen} onChange={handleFilterChange(setFilterSeen)} options={seenOptions} />
          {museums.length > 1 && (
            <Dropdown value={filterMuseum} onChange={handleFilterChange(setFilterMuseum)} options={museumOptions} />
          )}
        </div>
      </div>

      {/* Type-toggles: klik om een type te verbergen/tonen */}
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {types.map(([ty, n]) => {
            const on = !hiddenTypes.has(ty)
            return (
              <button
                key={ty}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(ty)}
                className={cn(
                  'flex items-center gap-1.5 text-xs rounded-full pl-2.5 pr-3 py-1 border transition-colors',
                  on
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/30'
                    : 'bg-zinc-800/60 border-white/10 text-zinc-500 line-through hover:text-zinc-300 hover:border-white/20'
                )}
              >
                {on ? <Check size={11} /> : <span className="w-[11px]" />}
                {t.has(`type.${ty}`) ? t(`type.${ty}`) : ty}
                <span className={on ? 'text-indigo-400/70' : 'text-zinc-600'}>{n}</span>
              </button>
            )
          })}
        </div>
      )}

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
          <p>{t('empty')}</p>
        </div>
      )}

      {/* Sentinel: laadt automatisch meer bij scrollen */}
      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="text-center pt-4 text-xs text-zinc-600">
          {t('loadingMore')}
        </div>
      )}
    </div>
  )
}
