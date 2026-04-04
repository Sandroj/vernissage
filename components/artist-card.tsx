import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'

interface ArtistCardProps {
  artist: {
    id: number
    name: string
    slug: string
    nationality?: string | null
    portrait_url?: string | null
    _count: { artworks: number }
  }
  seenCount: number
}

export default function ArtistCard({ artist, seenCount }: ArtistCardProps) {
  const total = artist._count.artworks
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="bg-slate-900 rounded-xl p-4 hover:bg-slate-800 transition-colors block"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
          {artist.portrait_url ? (
            <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xl font-bold">
              {artist.name[0]}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-white">{artist.name}</h2>
          {artist.nationality && (
            <p className="text-slate-400 text-sm">{artist.nationality}</p>
          )}
        </div>
      </div>
      <ProgressBar value={pct} seen={seenCount} total={total} animate={false} />
    </Link>
  )
}
