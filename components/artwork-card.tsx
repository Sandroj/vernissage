'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, Check, CheckCircle2 } from 'lucide-react'
import SeenModal from '@/components/seen-modal'
import Lightbox from '@/components/lightbox'
import { cn } from '@/lib/utils'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
}

interface SeenRecord {
  id: number
  dateSeen: string
  locationSeen?: string | null
  notes?: string | null
  rating?: number | null
  photo_url?: string | null
}

interface ArtworkCardProps {
  artwork: Artwork
  seen?: SeenRecord | null
  onSeenChange: () => void
  isLoggedIn: boolean
}

export default function ArtworkCard({ artwork, seen, onSeenChange, isLoggedIn }: ArtworkCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'

  return (
    <>
      <div
        className={cn(
          'relative group rounded-lg overflow-hidden bg-zinc-900 aspect-square transition-all duration-200',
          seen
            ? 'ring-2 ring-indigo-500/70 shadow-lg shadow-indigo-500/10'
            : 'ring-1 ring-white/5 hover:ring-white/15'
        )}
      >
        {/* Image — clicking goes to artwork detail */}
        <Link href={`/artworks/${artwork.id}`} className="block w-full h-full">
          <img
            src={imgSrc}
            alt={artwork.title}
            className={cn(
              'w-full h-full object-cover transition-all duration-300',
              seen ? 'brightness-90' : 'group-hover:scale-[1.03]'
            )}
            loading="lazy"
          />
        </Link>

        {/* Gezien indicator — subtle indigo shimmer top-left */}
        {seen && (
          <div className="absolute top-2 left-2 bg-indigo-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <CheckCircle2 size={10} className="text-white" />
            <span className="text-white text-[10px] font-medium">gezien</span>
          </div>
        )}

        {/* Hover overlay — two actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 gap-1.5">
          {/* Preview button */}
          <button
            onClick={(e) => { e.preventDefault(); setLightboxOpen(true) }}
            className="w-full flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs py-1.5 rounded-md transition-colors"
          >
            <Eye size={11} /> Bekijken
          </button>

          {/* Seen button — only when logged in */}
          {isLoggedIn && (
            <button
              onClick={(e) => { e.preventDefault(); setModalOpen(true) }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 text-white text-xs py-1.5 rounded-md transition-colors',
                seen
                  ? 'bg-indigo-600/80 hover:bg-indigo-600'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              )}
            >
              <Check size={11} /> {seen ? 'Bewerken' : 'Markeer gezien'}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Seen modal */}
      {isLoggedIn && (
        <SeenModal
          artworkId={artwork.id}
          artworkTitle={artwork.title}
          open={modalOpen}
          onOpenChange={setModalOpen}
          existingSeen={seen}
          onSaved={() => { setModalOpen(false); onSeenChange() }}
        />
      )}
    </>
  )
}
