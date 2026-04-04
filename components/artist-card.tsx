import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'

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
  }
  seenCount: number
}

export default function ArtistCard({ artist, seenCount }: ArtistCardProps) {
  const total = artist._count.artworks
  const pct = total > 0 ? (seenCount / total) * 100 : 0
  const years = artist.birth_year
    ? artist.death_year
      ? `${artist.birth_year}–${artist.death_year}`
      : `geb. ${artist.birth_year}`
    : null

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group bg-zinc-900 rounded-xl p-5 hover:bg-zinc-800/80 transition-all duration-200 block border border-white/5 hover:border-white/10"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 ring-2 ring-white/10 group-hover:ring-indigo-500/40 transition-all">
          {artist.portrait_url ? (
            <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-500">
              {artist.name[0]}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-white group-hover:text-indigo-200 transition-colors truncate">{artist.name}</h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            {[artist.nationality, years].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <ProgressBar value={pct} seen={seenCount} total={total} animate={false} />
    </Link>
  )
}
