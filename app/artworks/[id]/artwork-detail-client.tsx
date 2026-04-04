'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, MapPin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Lightbox from '@/components/lightbox'
import SeenModal from '@/components/seen-modal'
import ShareMenu from '@/components/share-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [seen, setSeen] = useState(initialSeen)
  const [currentSeenCount, setCurrentSeenCount] = useState(seenCount)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMsg, setReportMsg] = useState('')

  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'
  const yearLabel = artwork.year_end && artwork.year_end !== artwork.year_start
    ? `${artwork.year_start}–${artwork.year_end}`
    : artwork.year_start?.toString() ?? 'Onbekend jaar'

  async function handleSaved() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = all.find((s: any) => s.artworkId === artwork.id)
      setSeen(updated ?? null)
      if (!seen && updated) setCurrentSeenCount((c) => c + 1)
    }
    toast('Opgeslagen')
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
    toast('Melding verstuurd, dank je!')
  }

  const metaItems = [
    { label: 'Type', value: artwork.type_normalized },
    { label: 'Medium', value: artwork.medium_raw },
    { label: 'Afmetingen', value: artwork.dimensions_raw },
    { label: 'Museum', value: artwork.museum?.name },
    { label: 'Stad', value: artwork.museum ? `${artwork.museum.city}, ${artwork.museum.country}` : null },
  ].filter(item => item.value)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href={`/artists/${artwork.artist.slug}`}
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        {artwork.artist.name}
      </Link>

      {/* Image */}
      <div
        className="rounded-2xl overflow-hidden bg-zinc-900 mb-8 cursor-zoom-in border border-white/5 hover:border-white/10 transition-colors"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={imgSrc}
          alt={artwork.title}
          className="w-full object-contain max-h-[65vh]"
        />
      </div>

      {lightboxOpen && (
        <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Title + metadata */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{artwork.title}</h1>
            <p className="text-zinc-400 mt-1">
              <Link href={`/artists/${artwork.artist.slug}`} className="hover:text-indigo-400 transition-colors">
                {artwork.artist.name}
              </Link>
              <span className="mx-2">·</span>
              <span>{yearLabel}</span>
            </p>
          </div>
          <ShareMenu url={`/artworks/${artwork.id}`} title={`${artwork.title} — ${artwork.artist.name}`} />
        </div>

        {/* Metadata grid */}
        {metaItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metaItems.map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded-xl p-3.5 border border-white/5">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Seen section */}
        <div className="flex items-center gap-3 pt-2">
          {isLoggedIn ? (
            <Button
              onClick={() => setModalOpen(true)}
              className={cn(
                'gap-2',
                seen
                  ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-0'
              )}
            >
              {seen && <Check size={15} />}
              {seen ? 'Gezien · Bewerken' : 'Markeer als gezien'}
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                Inloggen om te markeren
              </Button>
            </Link>
          )}
          <span className="text-zinc-500 text-sm">
            {currentSeenCount === 0 ? 'Nog niemand' : currentSeenCount === 1 ? '1 persoon' : `${currentSeenCount} mensen`}
            {currentSeenCount > 0 ? ' gezien' : ''}
          </span>
        </div>

        {/* Location + report */}
        {artwork.museum && (
          <div className="flex items-center justify-between bg-zinc-900/60 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-zinc-500 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">{artwork.museum.name}</p>
                <p className="text-zinc-500 text-xs">{artwork.museum.city}, {artwork.museum.country}</p>
              </div>
            </div>
            {isLoggedIn && (
              <button
                onClick={() => setReportOpen(!reportOpen)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
              >
                <AlertCircle size={13} />
                Onjuist?
              </button>
            )}
          </div>
        )}

        {/* Report form */}
        {reportOpen && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <p className="text-amber-300 text-sm font-medium">Locatie melden als onjuist</p>
            <p className="text-zinc-400 text-xs">Weet je dat dit werk elders hangt? Laat het ons weten.</p>
            <textarea
              value={reportMsg}
              onChange={(e) => setReportMsg(e.target.value)}
              placeholder="Bijv: Dit werk hangt momenteel in het Rijksmuseum Amsterdam t/m juni 2026"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitReport} disabled={!reportMsg.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white border-0">
                Verstuur melding
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReportOpen(false)}
                className="text-zinc-400 hover:text-white">
                Annuleren
              </Button>
            </div>
          </div>
        )}
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
