'use client'
import { useState } from 'react'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { proxyImg } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ArtistCardProps {
  artist: {
    id: number
    name: string
    slug: string
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

  const [imgError, setImgError] = useState(false)
  const imgSrc = imgError ? null : proxyImg(featuredImage ?? artist.portrait_url, 300)

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-200 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        {imgSrc ? (
          <img
            src={imgSrc}
            onError={() => setImgError(true)}
            alt={t('featuredAlt', { name: artist.name })}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#e7e9fa] font-display text-4xl font-bold text-[#4256cc]/50">
            {artist.name[0]}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h2 className="truncate font-display text-base font-semibold text-stone-900 transition-colors group-hover:text-[#4256cc]">
          {artist.name}
        </h2>
        <ProgressBar value={pct} seen={seenCount} total={total} animate={false} hideLabel className="mt-1" />
      </div>
    </Link>
  )
}
