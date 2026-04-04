'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Lightbox from '@/components/lightbox'
import SeenModal from '@/components/seen-modal'
import ShareMenu from '@/components/share-menu'

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

  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'
  const yearLabel = artwork.year_end && artwork.year_end !== artwork.year_start
    ? `${artwork.year_start}–${artwork.year_end}`
    : artwork.year_start?.toString() ?? 'Onbekend'

  async function handleSaved() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = all.find((s: any) => s.artworkId === artwork.id)
      setSeen(updated ?? null)
      if (!seen && updated) setCurrentSeenCount((c) => c + 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/artists/${artwork.artist.slug}`}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={14} /> Terug naar {artwork.artist.name}
      </Link>

      {/* Afbeelding */}
      <div
        className="rounded-xl overflow-hidden bg-slate-900 mb-6 cursor-zoom-in"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={imgSrc}
          alt={artwork.title}
          className="w-full object-contain max-h-[60vh]"
        />
      </div>

      {lightboxOpen && (
        <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Titel + jaar */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">{artwork.title}</h1>
        <p className="text-slate-400 mt-1">
          {artwork.artist.name} · {yearLabel}
        </p>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Type', value: artwork.type_normalized },
          { label: 'Medium', value: artwork.medium_raw },
          { label: 'Afmetingen', value: artwork.dimensions_raw },
          { label: 'Museum', value: artwork.museum?.name },
          { label: 'Stad', value: artwork.museum ? `${artwork.museum.city}, ${artwork.museum.country}` : null },
        ]
          .filter((item) => item.value)
          .map(({ label, value }) => (
            <div key={label} className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className="text-white text-sm">{value}</p>
            </div>
          ))}
      </div>

      {/* Gezien-sectie */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Button
              onClick={() => setModalOpen(true)}
              variant={seen ? 'outline' : 'default'}
              className={seen ? 'gap-2 border-emerald-600 text-emerald-400' : 'gap-2'}
            >
              {seen && <Check size={15} />}
              {seen ? 'Gezien · Bewerken' : 'Markeer als gezien'}
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="outline">Inloggen om te markeren</Button>
            </Link>
          )}
          <span className="text-slate-400 text-sm">
            {currentSeenCount} {currentSeenCount === 1 ? 'persoon heeft' : 'mensen hebben'} dit gezien
          </span>
        </div>
        <ShareMenu url={`/artworks/${artwork.id}`} title={`${artwork.title} — ${artwork.artist.name}`} />
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
