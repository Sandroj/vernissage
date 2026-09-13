import { prisma, hasImage, localizeArtist, primaryCatalogue } from '@/lib/prisma'
import { getTranslations, getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArtistCard from '@/components/artist-card'
import ArtistsSearch from '@/components/artists-search'

// Use recognisable anchor works for the artist cards instead of whichever
// image happens to have the lowest database id.
const FEATURED_ARTIST_WORKS = [
  { artist: 'Vincent van Gogh', title: 'Sunflowers' },
  { artist: 'Claude Monet', title: 'Impression, sunrise' },
  { artist: 'Gustav Klimt', title: 'The Kiss' },
  { artist: 'Johannes Vermeer', title: 'Girl with a Pearl Earring' },
  { artist: 'Wassily Kandinsky', title: 'Composition VII' },
]

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('Artists')
  const locale = await getLocale()
  const q = searchParams.q ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { nationality: { contains: q } }] }
      : undefined,
    include: {
      _count: { select: { artworks: { where: primaryCatalogue } } },
      artworks: {
        take: 1,
        where: { AND: [primaryCatalogue, hasImage] },
        orderBy: { id: 'asc' },
        select: { image_local_path: true, image_url: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const featuredRows = await prisma.artwork.findMany({
    where: {
      AND: [hasImage, { OR: FEATURED_ARTIST_WORKS.map((work) => ({ title: work.title, artist: { name: work.artist } })) }],
    },
    select: { image_local_path: true, image_url: true, title: true, artist: { select: { name: true } } },
    orderBy: { id: 'asc' },
  })
  const featuredImages = new Map(
    FEATURED_ARTIST_WORKS.map((work) => [
      work.artist,
      featuredRows.find((row) => row.artist.name === work.artist && row.title === work.title),
    ])
  )

  // Haal seen-counts op voor ingelogde gebruiker
  const seenCounts: Record<number, number> = {}
  if (session?.user?.id) {
    for (const artist of artists) {
      const count = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { artistId: artist.id, ...primaryCatalogue } },
      })
      seenCounts[artist.id] = count
    }
  }

  return (
    <div className="pb-12">
      <div className="mb-9 grid gap-5 md:grid-cols-[1fr_320px] md:items-end">
        <div><p className="eyebrow mb-3">{t('eyebrow')}</p><h1 className="font-display text-6xl font-medium leading-none text-stone-900 sm:text-7xl">{t('title')}</h1><p className="mt-4 max-w-xl text-stone-500">{t('intro')}</p></div>
        <span className="justify-self-start rounded-full bg-[#ed694c] px-4 py-2 text-sm font-semibold text-white md:justify-self-end">{t('count', { count: artists.length })}</span>
      </div>

      <ArtistsSearch defaultValue={q} />

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={localizeArtist(artist, locale)}
            seenCount={seenCounts[artist.id] ?? 0}
            featuredImage={featuredImages.get(artist.name)?.image_local_path
              ?? featuredImages.get(artist.name)?.image_url
              ?? artist.artworks[0]?.image_local_path
              ?? artist.artworks[0]?.image_url
              ?? null}
          />
        ))}
        {artists.length === 0 && (
          <p className="col-span-full py-16 text-center text-stone-500">
            {t('noResults', { query: q })}
          </p>
        )}
      </div>
    </div>
  )
}
