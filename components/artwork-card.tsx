'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, MapPin } from 'lucide-react'
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
  catalogue_id?: string | null
  alternate_titles?: string | null
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
      <article className="group min-w-0">
      <div className={cn('relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-stone-200 shadow-sm ring-1 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl', seen ? 'ring-[#4256cc]/55' : 'ring-black/5')}>
        {/* Image — klikken gaat naar de detailpagina */}
        <Link href={`/artworks/${artwork.id}`} className="block w-full h-full">
          <img
            src={imgSrc}
            onError={() => setImgError(true)}
            alt={artwork.title}
            className={cn(
              'size-full object-cover transition-all duration-700',
              seen ? 'brightness-90' : 'group-hover:scale-[1.03]'
            )}
            loading="lazy"
          />
        </Link>

        {/* Gezien indicator */}
        {seen && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#4256cc]/92 px-2.5 py-1 backdrop-blur-sm">
            <CheckCircle2 size={10} className="text-white" />
            <span className="text-white text-[10px] font-medium">{t('seenBadge')}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-black/75 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {/* Gezien knop */}
          {isLoggedIn && (
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                'pointer-events-auto flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-white transition-colors',
                seen
                  ? 'bg-[#4256cc]/90 hover:bg-[#3447b8]'
                  : 'bg-[#ed694c] hover:bg-[#db573c]'
              )}
            >
              <Check size={11} /> {seen ? t('edit') : t('markSeen')}
            </button>
          )}
        </div>
      </div>
      <Link href={`/artworks/${artwork.id}`} className="block px-1 pt-3">
        <h3 className="line-clamp-2 font-display text-[1.08rem] font-semibold leading-tight text-stone-900 transition group-hover:text-[#4256cc]">{artwork.title}</h3>
        <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[.08em] text-stone-400">{[artwork.artist?.name, artwork.year_start].filter(Boolean).join(' · ')}</p>
        {artwork.museum && <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-stone-500"><MapPin size={11} className="shrink-0 text-[#ed694c]" /> {artwork.museum.city || artwork.museum.name}</p>}
      </Link>
      </article>

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
