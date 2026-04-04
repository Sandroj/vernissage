'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import SeenModal from '@/components/seen-modal'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
}

interface ArtworkCardProps {
  artwork: Artwork
  seen?: { id: number; dateSeen: string; locationSeen?: string | null; notes?: string | null; rating?: number | null; photo_url?: string | null } | null
  onSeenChange: () => void
  isLoggedIn: boolean
}

export default function ArtworkCard({ artwork, seen, onSeenChange, isLoggedIn }: ArtworkCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden bg-slate-800 aspect-square">
        <Link href={`/artworks/${artwork.id}`}>
          <img
            src={imgSrc}
            alt={artwork.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </Link>

        {/* Gezien overlay */}
        {seen && (
          <div className="absolute top-1.5 right-1.5 bg-emerald-500 rounded-full p-0.5">
            <Check size={12} className="text-white" />
          </div>
        )}

        {/* Hover overlay */}
        {isLoggedIn && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded w-full text-center"
            >
              {seen ? 'Bewerken' : 'Markeer gezien'}
            </button>
          </div>
        )}
      </div>

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
