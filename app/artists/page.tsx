import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArtistCard from '@/components/artist-card'
import ArtistsSearch from '@/components/artists-search'

// Bekendste werk per kunstenaar (op slug)
const FEATURED_IMAGES: Record<string, string> = {
  'vincent-van-gogh': '/images/artworks/vangogh-1399.jpg',   // Sunflowers
  'gustav-klimt': '/images/artworks/klimt-extra-4028.jpg',   // The Kiss
  'claude-monet': '/images/artworks/monet-197.jpg',           // Impression, sunrise
  'wassily-kandinsky': '/images/artworks/work-50.jpg',        // Composition VIII
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await getServerSession(authOptions)
  const q = searchParams.q ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { nationality: { contains: q } }] }
      : undefined,
    include: {
      _count: { select: { artworks: true } },
      artworks: {
        take: 1,
        where: { OR: [{ image_local_path: { not: null } }, { image_url: { not: null } }] },
        orderBy: { id: 'asc' },
        select: { image_local_path: true, image_url: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Haal seen-counts op voor ingelogde gebruiker
  const seenCounts: Record<number, number> = {}
  if (session?.user?.id) {
    for (const artist of artists) {
      const count = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { artistId: artist.id } },
      })
      seenCounts[artist.id] = count
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kunstenaars</h1>
        <span className="text-slate-400 text-sm">{artists.length} kunstenaar{artists.length !== 1 ? 's' : ''}</span>
      </div>

      <ArtistsSearch defaultValue={q} />

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            seenCount={seenCounts[artist.id] ?? 0}
            featuredImage={FEATURED_IMAGES[artist.slug] ?? artist.artworks[0]?.image_local_path ?? artist.artworks[0]?.image_url ?? null}
          />
        ))}
        {artists.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-12">
            Geen kunstenaars gevonden voor &ldquo;{q}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
