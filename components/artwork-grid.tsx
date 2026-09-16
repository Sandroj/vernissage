'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Search, ChevronDown, Check, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { ARTIST_TAXONOMIES } from '@/lib/artwork-taxonomy'

const PAGE_SIZE = 200

const TYPE_ORDER = ['painting', 'drawing', 'watercolor', 'work on paper', 'print']
const splitTypes = (value?: string | null) => value?.split('|').map((type) => type.trim()).filter(Boolean) ?? []

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
  attribution_status?: string | null
  museum?: { id: number; name: string; city: string; country?: string } | null
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

type SeenFilter = 'all' | 'seen' | 'unseen'

interface ArtworkGridProps {
  artworks: Artwork[]
  seenMap: Record<number, SeenRecord>
  isLoggedIn: boolean
  onRefresh?: (() => void) | undefined
  seenFilter?: SeenFilter
  onSeenFilterChange?: (v: SeenFilter) => void
  artistSlug?: string
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

export default function ArtworkGrid({ artworks, seenMap, isLoggedIn, onRefresh, seenFilter, onSeenFilterChange, artistSlug }: ArtworkGridProps) {
  const t = useTranslations('Grid')
  const tc = useTranslations('Countries')
  const locale = useLocale()
  const [filterTitle, setFilterTitle] = useState('')
  // Start with every type visible. Narrowing to paintings/drawings/etc. is an
  // explicit choice in the collapsed filter panel.
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set())
  const [filtersHydrated, setFiltersHydrated] = useState(false)
  const [internalFilterSeen, setInternalFilterSeen] = useState<SeenFilter>('all')
  const filterSeen = seenFilter ?? internalFilterSeen
  const setFilterSeen = onSeenFilterChange ?? setInternalFilterSeen
  const [filterMuseum, setFilterMuseum] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterTheme, setFilterTheme] = useState('all')
  const [showMissingImages, setShowMissingImages] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!artistSlug) {
      setFiltersHydrated(true)
      return
    }
    try {
      const saved = window.localStorage.getItem(`vernissage:artist-types:${artistSlug}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setHiddenTypes(new Set(parsed.filter((type): type is string => typeof type === 'string')))
      }
    } catch {
      // Ignore unavailable or malformed local storage; defaults remain visible.
    }
    setFiltersHydrated(true)
  }, [artistSlug])

  useEffect(() => {
    if (!artistSlug || !filtersHydrated) return
    window.localStorage.setItem(`vernissage:artist-types:${artistSlug}`, JSON.stringify(Array.from(hiddenTypes)))
  }, [artistSlug, filtersHydrated, hiddenTypes])

  // Unique types, in vaste volgorde, met aantallen
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of artworks) {
      for (const type of splitTypes(a.type_normalized)) counts.set(type, (counts.get(type) ?? 0) + 1)
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

  const missingImageCount = useMemo(
    () => artworks.filter((a) => !a.image_local_path && !a.image_url).length,
    [artworks]
  )

  const taxonomy = artistSlug ? ARTIST_TAXONOMIES[artistSlug] : undefined

  const facetCounts = useMemo(() => ({
    periods: taxonomy?.periods.map((option) => ({ ...option, count: artworks.filter(option.matches).length })).filter((option) => option.count > 0) ?? [],
    themes: taxonomy?.themes.map((option) => ({ ...option, count: artworks.filter(option.matches).length })).filter((option) => option.count > 0) ?? [],
  }), [artworks, taxonomy])

  // Unique museums, alphabetically grouped by country.
  const museums = useMemo(() => {
    const map = new Map<number, { id: number; name: string; country: string }>()
    for (const a of artworks) {
      if (a.museum) map.set(a.museum.id, { id: a.museum.id, name: a.museum.name, country: a.museum.country ?? '' })
    }
    const collator = new Intl.Collator(locale, { sensitivity: 'base' })
    return Array.from(map.values()).sort((a, b) =>
      collator.compare(a.country, b.country) || collator.compare(a.name, b.name)
    )
  }, [artworks, locale])

  const filtered = useMemo(() => artworks.filter((a) => {
    if (filterTitle) {
      const haystack = [a.title, a.alternate_titles, a.catalogue_id, a.jh_catalogue_id, a.artist?.name, a.museum?.name, a.museum?.city].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(filterTitle.toLowerCase())) return false
    }
    const artworkTypes = splitTypes(a.type_normalized)
    const hasImage = Boolean(a.image_local_path || a.image_url)
    // Image-less records have their own filter chip. When enabled, that chip
    // must show them even if every regular artwork type is hidden.
    if (hasImage && artworkTypes.length > 0 && artworkTypes.every((type) => hiddenTypes.has(type))) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    if (filterMuseum !== 'all' && (!a.museum || a.museum.id.toString() !== filterMuseum)) return false
    if (filterPeriod !== 'all' && !taxonomy?.periods.find((option) => option.key === filterPeriod)?.matches(a)) return false
    if (filterTheme !== 'all' && !taxonomy?.themes.find((option) => option.key === filterTheme)?.matches(a)) return false
    if (!showMissingImages && !hasImage) return false
    return true
  }), [artworks, filterTitle, hiddenTypes, filterSeen, filterMuseum, filterPeriod, filterTheme, showMissingImages, seenMap, taxonomy])

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

  const countryLabel = (country: string) => {
    if (!country || country === 'Onbekend' || country === 'Unknown') return t('unknownCountry')
    return tc.has(country) ? tc(country) : country
  }
  const museumCountries = Array.from(new Set(museums.map((museum) => museum.country))).sort((a, b) => {
    const aUnknown = !a || a === 'Onbekend' || a === 'Unknown'
    const bUnknown = !b || b === 'Onbekend' || b === 'Unknown'
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
    return new Intl.Collator(locale, { sensitivity: 'base' }).compare(countryLabel(a), countryLabel(b))
  })

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
          <Dropdown value={filterSeen} onChange={handleFilterChange(setFilterSeen)} options={seenOptions} />
          <button
            type="button"
            aria-expanded={showAdvancedFilters}
            aria-label={showAdvancedFilters ? t('hideFilters') : t('showFilters')}
            onClick={() => setShowAdvancedFilters((open) => !open)}
            className={cn('grid size-10 place-items-center rounded-full border transition-colors', showAdvancedFilters ? 'border-[#4256cc]/30 bg-[#e7e9fa] text-[#4256cc]' : 'border-black/10 bg-white/70 text-stone-500 hover:bg-white')}
          >
            {showAdvancedFilters ? <X size={15} /> : <SlidersHorizontal size={15} />}
          </button>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="paper-card flex flex-wrap items-center gap-2 rounded-2xl p-3">
          {facetCounts.periods.length > 1 && (
            <Dropdown value={filterPeriod} onChange={handleFilterChange(setFilterPeriod)} options={[
              { value: 'all', label: t('allPeriods') },
              ...facetCounts.periods.map((option) => ({ value: option.key, label: `${t(option.labelKey)} (${option.count})` })),
            ]} />
          )}
          {facetCounts.themes.length > 0 && (
            <Dropdown value={filterTheme} onChange={handleFilterChange(setFilterTheme)} options={[
              { value: 'all', label: t('allThemes') },
              ...facetCounts.themes.map((option) => ({ value: option.key, label: `${t(option.labelKey)} (${option.count})` })),
            ]} />
          )}
          {museums.length > 1 && (
            <div className="relative">
              <select
                value={filterMuseum}
                onChange={(event) => handleFilterChange(setFilterMuseum)(event.target.value)}
                className="h-10 max-w-[18rem] appearance-none cursor-pointer rounded-full border border-black/10 bg-white/70 py-1.5 pl-4 pr-9 text-xs font-medium text-stone-600 transition hover:bg-white focus:border-[#4256cc]/60 focus:outline-none"
              >
                <option value="all">{t('allMuseums')}</option>
                {museumCountries.map((country) => (
                  <optgroup key={country || 'unknown'} label={countryLabel(country)}>
                    {museums.filter((museum) => museum.country === country).map((museum) => (
                      <option key={museum.id} value={museum.id.toString()}>{museum.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          )}
        </div>
      )}

      {/* Type-toggles: klik om een type te verbergen/tonen */}
      {showAdvancedFilters && (types.length > 1 || missingImageCount > 0) && (
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
          {missingImageCount > 0 && (
            <button
              type="button"
              aria-pressed={showMissingImages}
              onClick={() => { setShowMissingImages((v) => !v); setVisibleCount(PAGE_SIZE) }}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                showMissingImages
                  ? 'border-[#4256cc]/25 bg-[#e7e9fa] text-[#3447b8] hover:bg-[#dce0fa]'
                  : 'border-black/10 bg-white/40 text-stone-400 line-through hover:text-stone-600'
              )}
            >
              {showMissingImages ? <Check size={11} /> : <span className="w-[11px]" />}
              {t('withoutImage')}
              <span className={showMissingImages ? 'text-[#4256cc]/60' : 'text-stone-400'}>{missingImageCount}</span>
            </button>
          )}
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
