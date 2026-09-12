'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Search, ChevronDown, Check, SlidersHorizontal } from 'lucide-react'
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
  catalogue_id?: string | null
  jh_catalogue_id?: string | null
  alternate_titles?: string | null
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
        className="h-10 appearance-none cursor-pointer rounded-full border border-black/10 bg-white/70 py-1.5 pl-4 pr-9 text-xs font-medium text-stone-600 transition hover:bg-white focus:border-[#4256cc]/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
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

  // Unique types, in vaste volgorde, met aantallen
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of artworks) {
      if (a.type_normalized) counts.set(a.type_normalized, (counts.get(a.type_normalized) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort(
      ([a], [b]) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99)
    )
  }, [artworks])

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
    for (const a of artworks) {
      if (a.museum) map.set(a.museum.id, a.museum.name)
    }
    return Array.from(map.entries())
  }, [artworks])

  const filtered = useMemo(() => artworks.filter((a) => {
    if (filterTitle) {
      const haystack = [a.title, a.alternate_titles, a.catalogue_id, a.jh_catalogue_id, a.artist?.name, a.museum?.name, a.museum?.city].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(filterTitle.toLowerCase())) return false
    }
    if (a.type_normalized && hiddenTypes.has(a.type_normalized)) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    if (filterMuseum !== 'all' && (!a.museum || a.museum.id.toString() !== filterMuseum)) return false
    return true
  }), [artworks, filterTitle, hiddenTypes, filterSeen, filterMuseum, seenMap])

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
    ...museums.map(([id, name]) => ({ value: id.toString(), label: name.length > 34 ? name.substring(0, 32) + '…' : name })),
  ]

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setVisibleCount(PAGE_SIZE) }
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-end justify-between">
        <div><p className="eyebrow mb-2">{t('collection')}</p><h2 className="font-display text-4xl font-medium text-stone-900 sm:text-5xl">{t('works', { count: artworks.length })}</h2>
          {seenCount > 0 && (
            <span className="mt-1 block text-sm font-medium text-[#4256cc]">{t('seen', { count: seenCount })}</span>
          )}
        </div>
        <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-stone-500">{t('visible', { count: filtered.length })}</span>
      </div>

      {/* Search + Filters */}
      <div className="paper-card flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#4256cc]" />
          <input
            type="text"
            value={filterTitle}
            onChange={(e) => { setFilterTitle(e.target.value); setVisibleCount(PAGE_SIZE) }}
            placeholder={t('searchPlaceholder')}
            className="h-11 w-full rounded-xl border-0 bg-transparent py-1.5 pl-10 pr-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:bg-white/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
          <SlidersHorizontal size={14} className="hidden text-stone-400 sm:block" />
          <Dropdown value={filterSeen} onChange={handleFilterChange(setFilterSeen)} options={seenOptions} />
          {museums.length > 1 && (
            <Dropdown value={filterMuseum} onChange={handleFilterChange(setFilterMuseum)} options={museumOptions} />
          )}
        </div>
      </div>

      {/* Type-toggles: klik om een type te verbergen/tonen */}
      {types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {types.map(([ty, n]) => {
            const on = !hiddenTypes.has(ty)
            return (
              <button
                key={ty}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(ty)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  on
                    ? 'border-[#4256cc]/25 bg-[#e7e9fa] text-[#3447b8] hover:bg-[#dce0fa]'
                    : 'border-black/10 bg-white/40 text-stone-400 line-through hover:text-stone-600'
                )}
              >
                {on ? <Check size={11} /> : <span className="w-[11px]" />}
                {t.has(`type.${ty}`) ? t(`type.${ty}`) : ty}
                <span className={on ? 'text-[#4256cc]/60' : 'text-stone-400'}>{n}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
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
        <div className="py-20 text-center text-stone-500">
          <p>{t('empty')}</p>
        </div>
      )}

      {/* Sentinel: laadt automatisch meer bij scrollen */}
      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="pt-4 text-center text-xs text-stone-400">
          {t('loadingMore')}
        </div>
      )}
    </div>
  )
}
