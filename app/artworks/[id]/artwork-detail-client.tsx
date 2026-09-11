'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, AlertCircle, ExternalLink, Database } from 'lucide-react'
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
    year_start?: number | null
    year_end?: number | null
    medium_raw?: string | null
    type_normalized?: string | null
    dimensions_raw?: string | null
    image_local_path?: string | null
    image_url?: string | null
    source_url?: string | null
    source_name?: string | null
    artist: { id: number; name: string; slug: string }
    museum?: { name: string; city: string; country: string } | null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSeen: any | null
  seenCount: number
  isLoggedIn: boolean
}

export default function ArtworkDetailClient({
  artwork,
  initialSeen,
  seenCount,
  isLoggedIn,
}: ArtworkDetailClientProps) {
  const t = useTranslations('Artwork')
  const tc = useTranslations('Countries')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [seen, setSeen] = useState(initialSeen)
  const [currentSeenCount, setCurrentSeenCount] = useState(seenCount)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  const imgSrc = artwork.image_local_path ?? proxyImg(artwork.image_url) ?? '/placeholder.jpg'
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
    }
    toast(t('saved'))
  }

  async function submitReport() {
    if (!reportMsg.trim()) return
    await fetch('/api/artwork-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId: artwork.id, message: reportMsg }),
    })
    setReportOpen(false)
    setReportMsg('')
    toast(t('reportSent'))
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href={`/artists/${artwork.artist.slug}`}
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        {artwork.artist.name}
      </Link>

      {/* Tweekoloms layout op desktop, gestapeld op mobiel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8 items-start">

        {/* LINKS: Afbeelding — altijd dominant */}
        <div>
          <div
            className="rounded-2xl overflow-hidden bg-zinc-900 cursor-zoom-in border border-white/5 hover:border-white/10 transition-colors"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={imgSrc}
              alt={artwork.title}
              className="w-full object-contain max-h-[75vh]"
            />
          </div>
          {lightboxOpen && (
            <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
          )}

          {/* Seen-knop onder afbeelding op mobiel */}
          <div className="flex items-center gap-3 mt-4 lg:hidden">
            <SeenButton seen={seen} isLoggedIn={isLoggedIn} onOpen={() => setModalOpen(true)} t={t} />
            <SeenCount count={currentSeenCount} t={t} />
          </div>
        </div>

        {/* RECHTS: Alle metadata — compact en hiërarchisch */}
        <div className="space-y-5">

          {/* Titel + jaar */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-white leading-snug">{artwork.title}</h1>
              <ShareMenu url={`/artworks/${artwork.id}`} title={`${artwork.title} — ${artwork.artist.name}`} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
              <Link href={`/artists/${artwork.artist.slug}`} className="hover:text-indigo-400 transition-colors font-medium">
                {artwork.artist.name}
              </Link>
              {yearLabel && (
                <>
                  <span className="text-zinc-600">·</span>
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

          {/* Scheidingslijn */}
          <div className="border-t border-white/5" />

          {/* Metadata lijst */}
          <div className="space-y-3">
            {artwork.medium_raw && (
              <MetaRow label={t('medium')} value={artwork.medium_raw} />
            )}
            {artwork.type_normalized && (
              <MetaRow label={t('type')} value={t.has(`typeValue.${artwork.type_normalized}`) ? t(`typeValue.${artwork.type_normalized}`) : capitalize(artwork.type_normalized)} />
            )}
            {artwork.dimensions_raw && (
              <MetaRow label={t('dimensions')} value={artwork.dimensions_raw} />
            )}
            {artwork.museum && (
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{t('location')}</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white text-sm">
                      <Link href="#" className="hover:text-indigo-400 transition-colors">
                        {artwork.museum.name}
                      </Link>
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {[artwork.museum.city, artwork.museum.country && tc.has(artwork.museum.country) ? tc(artwork.museum.country) : artwork.museum.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  {isLoggedIn && (
                    <button
                      onClick={() => setReportOpen(!reportOpen)}
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-amber-400 transition-colors shrink-0 mt-0.5"
                      title={t('reportTooltip')}
                    >
                      <AlertCircle size={12} />
                      {t('reportWrong')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Report form */}
          {reportOpen && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 space-y-2.5">
              <p className="text-amber-300 text-xs font-medium">{t('reportTitle')}</p>
              <textarea
                value={reportMsg}
                onChange={(e) => setReportMsg(e.target.value)}
                placeholder={t('reportPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitReport} disabled={!reportMsg.trim()}
                  className="bg-amber-600 hover:bg-amber-500 text-white border-0 h-7 text-xs">
                  {t('send')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReportOpen(false)}
                  className="text-zinc-400 hover:text-white h-7 text-xs">
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Scheidingslijn */}
          <div className="border-t border-white/5" />

          {/* Bron */}
          <div className="space-y-1.5">
            {artwork.source_name && (
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
                <Database size={11} />
                <span>{t('source', { name: artwork.source_name })}</span>
              </div>
            )}
            {artwork.source_url && (
              <a
                href={artwork.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
              >
                <ExternalLink size={11} />
                {t('viewOriginal')}
              </a>
            )}
          </div>

        </div>
      </div>

      <SeenModal
        artworkId={artwork.id}
        artworkTitle={artwork.title}
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingSeen={seen}
        onSaved={handleSaved}
      />
    </div>
  )
}

type T = ReturnType<typeof useTranslations<'Artwork'>>

function SeenButton({ seen, isLoggedIn, onOpen, t }: { seen: unknown; isLoggedIn: boolean; onOpen: () => void; t: T }) {
  if (!isLoggedIn) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5 text-xs h-8">
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
          ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-0'
      )}
    >
      {!!seen && <Check size={12} />}
      {seen ? t('seenEdit') : t('markSeen')}
    </Button>
  )
}

function SeenCount({ count, t }: { count: number; t: T }) {
  if (count === 0) return <span className="text-zinc-600 text-xs">{t('nobodyYet')}</span>
  return <span className="text-zinc-500 text-xs">{t('seenBy', { count })}</span>
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-white text-sm leading-snug">{value}</p>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
