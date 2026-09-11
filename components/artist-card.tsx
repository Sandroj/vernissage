'use client'
import { useState } from 'react'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { proxyImg } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { ArrowUpRight } from 'lucide-react'

interface ArtistCardProps {
  artist: {
    id: number
    name: string
    slug: string
    nationality?: string | null
    birth_year?: number | null
    death_year?: number | null
    portrait_url?: string | null
    _count: { artworks: number }
    artworks: { image_local_path?: string | null; image_url?: string | null }[]
  }
  seenCount: number
  featuredImage?: string | null
}

export default function ArtistCard({ artist, seenCount, featuredImage }: ArtistCardProps) {
  const t = useTranslations('Artists')
  const total = artist._count.artworks
  const pct = total > 0 ? (seenCount / total) * 100 : 0
  const years = artist.birth_year
    ? artist.death_year
      ? `${artist.birth_year}–${artist.death_year}`
      : t('born', { year: artist.birth_year })
    : null

  const [imgError, setImgError] = useState(false)
  const imgSrc = imgError ? null : proxyImg(featuredImage)

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="paper-card group relative block overflow-hidden rounded-[1.75rem] transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
          {imgSrc ? (
            <img
              src={imgSrc}
              onError={() => setImgError(true)}
              alt={t('featuredAlt', { name: artist.name })}
              className="size-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-[#e7e9fa] font-display text-6xl font-bold text-[#4256cc]/50">
              {artist.name[0]}
            </div>
          )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-[#fffdf8]/90 text-stone-800 opacity-0 shadow-lg transition group-hover:opacity-100"><ArrowUpRight size={16} /></span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-5 min-w-0">
          <h2 className="font-display truncate text-3xl font-semibold text-stone-900 transition-colors group-hover:text-[#4256cc]">{artist.name}</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-[.12em] text-stone-400">
            {[artist.nationality, years].filter(Boolean).join(' · ')}
          </p>
        </div>
        <ProgressBar value={pct} seen={seenCount} total={total} animate={false} />
      </div>
    </Link>
  )
}
