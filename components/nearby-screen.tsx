'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { MapPin, LocateFixed, ArrowLeftRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { MuseumPin } from '@/components/museum-map'

const MuseumMap = dynamic(() => import('@/components/museum-map'), {
  ssr: false,
  loading: () => (
    <div className="flex w-full items-center justify-center rounded-[1.5rem] bg-[#e7e1d6] ring-1 ring-black/5" style={{ height: 'min(62vh, 620px)', minHeight: 360 }}>
      <div className="text-sm text-stone-500">Kaart laden…</div>
    </div>
  ),
})

interface NearbyArtwork {
  id: number
  title: string
  year: number | null
  image: string | undefined
  artistName: string
  distanceKm: number
  location: { id: number; name: string; city: string; country: string; lat: number; lng: number }
  onLoan: boolean
  homeMuseum: { name: string; city: string } | null
}

type LocationState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export default function NearbyScreen({ artists }: { artists: { id: number; name: string }[] }) {
  const t = useTranslations('Nearby')
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<number>>(new Set())
  const [artworks, setArtworks] = useState<NearbyArtwork[]>([])
  const [loading, setLoading] = useState(false)

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setLocationState('unsupported')
      return
    }
    setLocationState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationState('granted')
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, timeout: 10_000 }
    )
  }

  function toggleArtist(id: number) {
    setSelectedArtistIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!coords) return
    const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng) })
    if (selectedArtistIds.size > 0) params.set('artistIds', Array.from(selectedArtistIds).join(','))

    let cancelled = false
    setLoading(true)
    fetch(`/api/artworks/nearby?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setArtworks(data.artworks ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [coords, selectedArtistIds])

  const pins = useMemo<MuseumPin[]>(() => {
    const byLocation = new Map<number, MuseumPin>()
    for (const artwork of artworks) {
      const loc = artwork.location
      const existing = byLocation.get(loc.id)
      if (existing) {
        existing.artworkCount += 1
        existing.hasLoan = existing.hasLoan || artwork.onLoan
      } else {
        byLocation.set(loc.id, {
          id: loc.id,
          name: loc.name,
          city: loc.city,
          country: loc.country,
          lat: loc.lat,
          lng: loc.lng,
          artworkCount: 1,
          previewImage: artwork.image ?? null,
          seenCount: 0,
          hasLoan: artwork.onLoan,
        })
      }
    }
    return Array.from(byLocation.values())
  }, [artworks])

  return (
    <div>
      {locationState !== 'granted' && (
        <div className="paper-card flex flex-col items-center gap-3 rounded-[1.5rem] p-10 text-center">
          <MapPin size={28} className="text-[#4256cc]" />
          <p className="max-w-md text-sm text-stone-500">{t('intro')}</p>
          <button
            onClick={requestLocation}
            disabled={locationState === 'loading'}
            className="flex items-center gap-2 rounded-full bg-[#4256cc] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3447b8] disabled:opacity-60"
          >
            <LocateFixed size={16} />
            {locationState === 'loading' ? t('locating') : t('useLocation')}
          </button>
          {locationState === 'denied' && <p className="text-xs text-red-600">{t('denied')}</p>}
          {locationState === 'unsupported' && <p className="text-xs text-red-600">{t('unsupported')}</p>}
        </div>
      )}

      {locationState === 'granted' && (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedArtistIds(new Set())}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                selectedArtistIds.size === 0 ? 'bg-[#4256cc] text-white' : 'bg-black/5 text-stone-600 hover:bg-black/10'
              )}
            >
              {t('allArtists')}
            </button>
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => toggleArtist(artist.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  selectedArtistIds.has(artist.id) ? 'bg-[#4256cc] text-white' : 'bg-black/5 text-stone-600 hover:bg-black/10'
                )}
              >
                {artist.name}
              </button>
            ))}
          </div>

          <MuseumMap
            museums={pins}
            labels={{ works: t('works'), seen: '', openMuseum: t('openMuseum'), onLoanHint: t('onLoanHint') }}
            compact
          />

          <p className="mb-4 mt-5 text-sm text-stone-500">
            {loading ? t('loading') : t('resultCount', { count: artworks.length })}
          </p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {artworks.map((artwork) => (
              <Link key={artwork.id} href={`/artworks/${artwork.id}`} className="group min-w-0">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-stone-200 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <Image src={artwork.image ?? '/placeholder.svg'} alt={artwork.title} fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 18vw" className="object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <h3 className="font-display mt-3 line-clamp-2 text-lg font-semibold leading-tight text-stone-900 group-hover:text-[#4256cc]">{artwork.title}</h3>
                <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[.08em] text-stone-400">
                  {[artwork.artistName, artwork.year].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-stone-500">
                  <MapPin size={11} className="text-[#ed694c]" />
                  {t('distance', { km: artwork.distanceKm })} · {artwork.location.city}
                  {artwork.onLoan && (
                    <span
                      className="inline-flex shrink-0 text-amber-600"
                      title={artwork.homeMuseum ? t('onLoanFrom', { museum: artwork.homeMuseum.name }) : t('onLoanHint')}
                    >
                      <ArrowLeftRight size={11} />
                    </span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
