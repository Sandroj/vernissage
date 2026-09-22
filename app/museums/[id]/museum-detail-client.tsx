'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Globe, ImageOff, MapPin } from 'lucide-react'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'
import { useTranslations } from 'next-intl'
import { proxyImg } from '@/lib/utils'

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
  loans?: { id: number; toMuseum: { id: number; name: string; city: string; country?: string } }[]
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
  incomingLoans: { id: number; fromOwnerName: string | null; fromMuseum: { id: number; name: string } | null; artwork: ArtworkWithArtist }[]
}

export default function MuseumDetailClient({ museum, seenMap: initialSeenMap, isLoggedIn, artists, incomingLoans }: MuseumDetailClientProps) {
  const [seenMap, setSeenMap] = useState(initialSeenMap)
  const t = useTranslations('Museums')
  const tc = useTranslations('Countries')
  const country = museum.country && tc.has(museum.country) ? tc(museum.country) : museum.country

  const availableArtworks = museum.artworks.filter((artwork) => artwork.image_url || artwork.image_local_path)
  const catalogueIds = new Set(museum.artworks.map((artwork) => artwork.id))
  const seenCount = Object.keys(seenMap).filter((id) => catalogueIds.has(Number(id))).length
  const linkedTotal = museum.artworks.length
  const availableTotal = availableArtworks.length
  const withoutImage = linkedTotal - availableTotal
  const pct = linkedTotal > 0 ? (seenCount / linkedTotal) * 100 : 0
  const cover = proxyImg(availableArtworks[0]?.image_local_path ?? availableArtworks[0]?.image_url)

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
    <div className="pb-12">
      <div className="relative mb-10 min-h-[360px] overflow-hidden rounded-[2rem] bg-[#25231f] p-6 text-white sm:p-9 lg:p-11">
        {cover && <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-25" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#24211d] via-[#24211d]/92 to-[#24211d]/45" />
        <div className="relative flex min-h-[290px] items-end">
          <div className="flex w-full items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Building2 size={24} className="text-[#f4b548]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#f4b548]">{t('collectionEyebrow')}</p>
              <h1 className="font-display mb-2 text-4xl font-medium leading-none text-[#fffaf0] sm:text-6xl">{museum.name}</h1>
              <p className="mb-5 flex flex-wrap items-center gap-x-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {museum.city}{country ? `, ${country}` : ''}</span>
                {museum.website && (
                  <a href={museum.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-white/75 transition hover:text-white">
                    <Globe size={12} /> {t('website')}
                  </a>
                )}
              </p>

              <div className="mb-5 max-w-sm [&_span]:text-white/65">
                <ProgressBar value={pct} seen={seenCount} total={linkedTotal} animate />
              </div>

              <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm">
                <div><span className="text-2xl font-bold text-white">{availableTotal}</span><span className="ml-1.5 text-white/45">{t('availableInApp')}</span></div>
                <div><span className="text-2xl font-bold text-white">{linkedTotal}</span><span className="ml-1.5 text-white/45">{t('linkedWorks')}</span></div>
                {seenCount > 0 && <div><span className="text-2xl font-bold text-[#f4b548]">{seenCount}</span><span className="ml-1.5 text-white/45">{t('seen')}</span></div>}
              </div>

              {artists.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {artists.map((artist) => (
                    <Link key={artist.slug} href={`/artists/${artist.slug}`} className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/15 hover:text-white">
                      {artist.name}<span className="ml-0.5 text-white/35">{artist.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {withoutImage > 0 && (
        <div className="paper-card mb-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-stone-500">
          <ImageOff size={17} className="mt-0.5 shrink-0 text-stone-400" />
          <p>{t('withoutImage', { count: withoutImage })}</p>
        </div>
      )}

      {incomingLoans.length > 0 && <section className="mb-8 space-y-3">
        <div><p className="eyebrow">{t('loanEyebrow')}</p><h2 className="font-display text-3xl text-stone-900">{t('onLoanHere')}</h2></div>
        <div className="grid gap-2 sm:grid-cols-2">{incomingLoans.map((loan) => <Link key={loan.id} href={`/artworks/${loan.artwork.id}`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-800 transition hover:bg-amber-100"><span className="font-semibold">{loan.artwork.title}</span><span className="block text-xs text-stone-600">{loan.artwork.artist.name} · {t('onLoanFrom', { owner: loan.fromMuseum?.name ?? loan.fromOwnerName ?? t('unknownOwner') })}</span></Link>)}</div>
      </section>}

      {museum.artworks.some((work) => work.loans?.length) && <section className="mb-8 space-y-2">
        <p className="eyebrow">{t('loanEyebrow')}</p><h2 className="font-display text-2xl text-stone-900">{t('loanedOut')}</h2>
        {museum.artworks.flatMap((work) => (work.loans ?? []).map((loan) => <Link key={loan.id} href={`/artworks/${work.id}`} className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-800"><span className="font-semibold">{work.title}</span><span className="ml-2 text-stone-600">{t('onLoanAt', { museum: loan.toMuseum.name })}</span></Link>))}
      </section>}

      {linkedTotal > 0 ? (
        <ArtworkGrid artworks={museum.artworks} seenMap={seenMap} isLoggedIn={isLoggedIn} onRefresh={refresh} />
      ) : (
        <div className="paper-card rounded-[2rem] p-10 text-center text-stone-500">
          <ImageOff size={30} className="mx-auto mb-3 text-stone-300" />
          <p className="font-display text-2xl text-stone-900">{t('noAvailableWorks')}</p>
        </div>
      )}
    </div>
  )
}
