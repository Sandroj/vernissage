import { prisma, hasImage } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArtistCard from '@/components/artist-card'
import ArtistsSearch from '@/components/artists-search'

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('Artists')
  const q = searchParams.q ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { nationality: { contains: q } }] }
      : undefined,
    include: {
      _count: { select: { artworks: { where: hasImage } } },
      artworks: {
        take: 1,
        where: hasImage,
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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <span className="text-slate-400 text-sm">{t('count', { count: artists.length })}</span>
      </div>

      <ArtistsSearch defaultValue={q} />

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            seenCount={seenCounts[artist.id] ?? 0}
            featuredImage={artist.artworks[0]?.image_local_path ?? artist.artworks[0]?.image_url ?? null}
          />
        ))}
        {artists.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-12">
            {t('noResults', { query: q })}
          </p>
        )}
      </div>
    </div>
  )
}
