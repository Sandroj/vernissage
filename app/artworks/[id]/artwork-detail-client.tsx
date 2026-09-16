'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, AlertCircle, ExternalLink, Database, HelpCircle, ImageOff, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Lightbox from '@/components/lightbox'
import SeenModal from '@/components/seen-modal'
import ShareMenu from '@/components/share-menu'
import { cn, proxyImg } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface ArtworkDetailClientProps {
  artwork: {
    id: number
    title: string
    title_de?: string | null
    year_start?: number | null
    year_end?: number | null
    medium_raw?: string | null
    type_normalized?: string | null
    dimensions_raw?: string | null
    image_local_path?: string | null
    image_url?: string | null
    source_url?: string | null
    source_name?: string | null
    catalogue_id?: string | null
    jh_catalogue_id?: string | null
    alternate_titles?: string | null
    location_confidence?: string | null
    location_verified_at?: string | Date | null
    attribution_status?: string | null
    attribution_note?: string | null
    artist: { id: number; name: string; slug: string }
    museum?: { id: number; name: string; city: string; country: string } | null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSeen: any | null
  seenCount: number
  isLoggedIn: boolean
  backHref?: string
}

export default function ArtworkDetailClient({
  artwork,
  initialSeen,
  seenCount,
  isLoggedIn,
  backHref,
}: ArtworkDetailClientProps) {
  const t = useTranslations('Artwork')
  const tc = useTranslations('Countries')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [seen, setSeen] = useState(initialSeen)
  const [currentSeenCount, setCurrentSeenCount] = useState(seenCount)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  const imgSrc = artwork.image_local_path ?? proxyImg(artwork.image_url)
  const yearLabel = artwork.year_end && artwork.year_end !== artwork.year_start
    ? `${artwork.year_start}–${artwork.year_end}`
    : artwork.year_start?.toString() ?? null

  async function handleSaved() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = all.find((s: any) => s.artworkId === artwork.id)
      setSeen(updated ?? null)
      if (!seen && updated) setCurrentSeenCount((c) => c + 1)
      if (seen && !updated) setCurrentSeenCount((c) => Math.max(0, c - 1))
    }
    toast(t('saved'))
  }

  function handleRemoved() {
    setSeen(null)
    setCurrentSeenCount((c) => Math.max(0, c - 1))
    toast(t('removed'))
  }

  async function submitReport() {
    if (!reportMsg.trim()) return
    try {
      const response = await fetch('/api/work-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'incorrect_listing', artistName: artwork.artist.name, artworkId: artwork.id, artworkTitle: artwork.title, message: reportMsg }),
      })
      if (!response.ok) throw new Error('submission_failed')
      const result = await response.json()
      setReportOpen(false)
      setReportMsg('')
      toast(result.emailSent ? t('reportSent') : result.emailConfigured ? t('reportFailedDelivery') : t('reportSaved'))
    } catch {
      toast(t('reportFailed'))
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Back */}
      <Link
        href={backHref ?? `/artists/${artwork.artist.slug}`}
        className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#4256cc]"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        {artwork.artist.name}
      </Link>

      {/* Tweekoloms layout op desktop, gestapeld op mobiel */}
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">

        {/* LINKS: Afbeelding — altijd dominant */}
        <div>
          <div
            className={cn('overflow-hidden rounded-[2rem] bg-[#e5ded1] p-3 shadow-[0_30px_80px_rgba(68,52,30,.13)] ring-1 ring-black/8 transition sm:p-5', imgSrc && 'cursor-zoom-in hover:shadow-[0_35px_95px_rgba(68,52,30,.2)]')}
            onClick={() => imgSrc && setLightboxOpen(true)}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={artwork.title}
                className="max-h-[78vh] w-full rounded-[1.2rem] object-contain"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[1.2rem] bg-[#ddd4c4] text-stone-500">
                <ImageOff size={38} aria-hidden="true" />
                <p className="text-sm font-medium">{t('missingImage')}</p>
              </div>
            )}
          </div>
          {lightboxOpen && imgSrc && (
            <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
          )}

          {/* Seen-knop onder afbeelding op mobiel */}
          <div className="flex items-center gap-3 mt-4 lg:hidden">
            <SeenButton seen={seen} isLoggedIn={isLoggedIn} onOpen={() => setModalOpen(true)} t={t} />
            <SeenCount count={currentSeenCount} t={t} />
          </div>
        </div>

        {/* RECHTS: Alle metadata — compact en hiërarchisch */}
        <aside className="paper-card space-y-6 rounded-[2rem] p-6 sm:p-8 lg:sticky lg:top-24">

          {/* Titel + jaar */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display text-4xl font-semibold leading-[1.02] text-stone-900">{artwork.title}</h1>
              <ShareMenu url={`/artworks/${artwork.id}`} title={`${artwork.title} — ${artwork.artist.name}`} />
            </div>
            {artwork.title_de && (
              <p className="mt-2 text-base italic leading-snug text-stone-500">
                <span className="mb-0.5 block font-sans text-[10px] font-semibold not-italic uppercase tracking-[.12em] text-stone-400">{t('germanTitle')}</span>
                {artwork.title_de}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
              <Link href={`/artists/${artwork.artist.slug}`} className="font-semibold text-[#4256cc] transition-colors hover:text-[#3447b8]">
                {artwork.artist.name}
              </Link>
              {yearLabel && (
                <>
                  <span className="text-stone-300">·</span>
                  <span>{yearLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Seen-knop — desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <SeenButton seen={seen} isLoggedIn={isLoggedIn} onOpen={() => setModalOpen(true)} t={t} />
            <SeenCount count={currentSeenCount} t={t} />
          </div>

          {/* Omstreden toeschrijving */}
          {artwork.attribution_status === 'disputed' && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-50 p-3.5 text-amber-800">
              <HelpCircle size={15} className="mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">{t('attributionDisputed')}</p>
                {artwork.attribution_note && (
                  <p className="text-xs leading-snug text-amber-700">{artwork.attribution_note}</p>
                )}
              </div>
            </div>
          )}

          {/* Scheidingslijn */}
          <div className="border-t border-black/8" />

          {/* Metadata lijst */}
          <div className="space-y-3">
            {artwork.catalogue_id && <MetaRow label={t('catalogue')} value={artwork.catalogue_id} />}
            {artwork.jh_catalogue_id && <MetaRow label={t('jhCatalogue')} value={artwork.jh_catalogue_id} />}
            {artwork.medium_raw && (
              <MetaRow label={t('medium')} value={artwork.medium_raw} />
            )}
            {artwork.type_normalized && (
              <MetaRow label={t('type')} value={artwork.type_normalized.split('|').map((type) => t.has(`typeValue.${type}`) ? t(`typeValue.${type}`) : capitalize(type)).join(' · ')} />
            )}
            {artwork.dimensions_raw && (
              <MetaRow label={t('dimensions')} value={artwork.dimensions_raw} />
            )}
            {artwork.museum && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-stone-400">{t('location')}</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/museums/${artwork.museum.id}`} title={t('viewMuseum')} className="flex items-center gap-1.5 text-sm font-semibold text-stone-900 transition hover:text-[#4256cc]"><MapPin size={13} className="text-[#ed694c]" />
                      <span className="border-b border-transparent hover:border-[#4256cc]/30">
                        {artwork.museum.name}
                      </span>
                    </Link>
                    <p className="ml-5 mt-1 text-xs text-stone-500">
                      {[artwork.museum.city, artwork.museum.country && tc.has(artwork.museum.country) ? tc(artwork.museum.country) : artwork.museum.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setReportOpen(!reportOpen)}
                    className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-stone-400 transition-colors hover:text-amber-600"
                    title={t('reportTooltip')}
                  >
                    <AlertCircle size={12} />
                    {t('reportWrong')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Report form */}
          {reportOpen && (
            <div className="space-y-2.5 rounded-xl border border-amber-500/25 bg-amber-50 p-3.5">
              <p className="text-xs font-medium text-amber-800">{t('reportTitle')}</p>
              <textarea
                value={reportMsg}
                onChange={(e) => setReportMsg(e.target.value)}
                placeholder={t('reportPlaceholder')}
                className="w-full resize-none rounded-lg border border-black/10 bg-white p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitReport} disabled={!reportMsg.trim()}
                  className="bg-amber-600 hover:bg-amber-500 text-white border-0 h-7 text-xs">
                  {t('send')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReportOpen(false)}
                  className="h-7 text-xs text-stone-500 hover:text-stone-900">
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Scheidingslijn */}
          <div className="border-t border-black/8" />

          {/* Bron */}
          <div className="space-y-1.5">
            {artwork.source_name && (
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Database size={11} />
                <span>{t('source', { name: artwork.source_name })}</span>
              </div>
            )}
            {artwork.source_url && (
              <a
                href={artwork.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-stone-400 transition-colors hover:text-[#4256cc]"
              >
                <ExternalLink size={11} />
                {t('viewOriginal')}
              </a>
            )}
          </div>

        </aside>
      </div>

      <SeenModal
        artworkId={artwork.id}
        artworkTitle={artwork.title}
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingSeen={seen}
        onSaved={handleSaved}
        onRemoved={handleRemoved}
      />
    </div>
  )
}

type T = ReturnType<typeof useTranslations<'Artwork'>>

function SeenButton({ seen, isLoggedIn, onOpen, t }: { seen: unknown; isLoggedIn: boolean; onOpen: () => void; t: T }) {
  if (!isLoggedIn) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="h-9 rounded-full border-black/10 bg-white/60 px-4 text-xs text-stone-800 hover:bg-white">
          {t('loginToMark')}
        </Button>
      </Link>
    )
  }
  return (
    <Button
      onClick={onOpen}
      size="sm"
      className={cn(
        'gap-1.5 h-8 text-xs',
        seen
          ? 'border border-[#4256cc]/25 bg-[#e7e9fa] text-[#3447b8] hover:bg-[#dce0fa]'
          : 'border-0 bg-[#ed694c] text-white hover:bg-[#db573c]'
      )}
    >
      {!!seen && <Check size={12} />}
      {seen ? t('seenEdit') : t('markSeen')}
    </Button>
  )
}

function SeenCount({ count, t }: { count: number; t: T }) {
  if (count === 0) return <span className="text-xs text-stone-400">{t('nobodyYet')}</span>
  return <span className="text-xs text-stone-500">{t('seenBy', { count })}</span>
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs uppercase tracking-widest text-stone-400">{label}</p>
      <p className="text-sm leading-snug text-stone-900">{value}</p>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
