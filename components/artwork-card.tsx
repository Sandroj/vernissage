'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2 } from 'lucide-react'
import SeenModal from '@/components/seen-modal'
import { cn, proxyImg } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  medium_raw?: string | null
  dimensions_raw?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
  artist?: { name: string; slug: string } | null
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
  const t = useTranslations('Card')
  const [modalOpen, setModalOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const rawSrc = artwork.image_local_path ?? artwork.image_url ?? undefined
  const imgSrc = proxyImg(rawSrc)

  if (imgError) return null

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
        {/* Image — klikken gaat naar de detailpagina */}
        <Link href={`/artworks/${artwork.id}`} className="block w-full h-full">
          <img
            src={imgSrc}
            onError={() => setImgError(true)}
            alt={artwork.title}
            className={cn(
              'w-full h-full object-cover transition-all duration-300',
              seen ? 'brightness-90' : 'group-hover:scale-[1.03]'
            )}
            loading="lazy"
          />
        </Link>

        {/* Gezien indicator */}
        {seen && (
          <div className="absolute top-2 left-2 bg-indigo-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-none">
            <CheckCircle2 size={10} className="text-white" />
            <span className="text-white text-[10px] font-medium">{t('seenBadge')}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 gap-1.5 pointer-events-none">
          {/* Gezien knop */}
          {isLoggedIn && (
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 text-white text-xs py-1.5 rounded-md transition-colors pointer-events-auto',
                seen
                  ? 'bg-indigo-600/80 hover:bg-indigo-600'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              )}
            >
              <Check size={11} /> {seen ? t('edit') : t('markSeen')}
            </button>
          )}
        </div>
      </div>

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
