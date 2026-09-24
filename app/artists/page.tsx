import { prisma, hasImage, localizeArtist, primaryCatalogue, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { getTranslations, getLocale } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArtistCard from '@/components/artist-card'
import ArtistsSearch from '@/components/artists-search'
import { unstable_cache } from 'next/cache'

// Use recognisable anchor works for the artist cards instead of whichever
// image happens to have the lowest database id.
const FEATURED_ARTIST_WORKS = [
  { artist: 'Vincent van Gogh', title: 'Sunflowers' },
  { artist: 'Claude Monet', title: 'Impression, sunrise' },
  { artist: 'Gustav Klimt', title: 'The Kiss' },
  { artist: 'Johannes Vermeer', title: 'Girl with a Pearl Earring' },
  { artist: 'Wassily Kandinsky', title: 'Composition X' },
  { artist: 'Frida Kahlo', title: 'Self-Portrait with Thorn Necklace and Hummingbird' },
]

// Zoekresultaten zijn ook publieke catalogus-data — cache per zoekterm (`q`
// zit automatisch in de cache-key omdat unstable_cache de functie-argumenten
// meeneemt).
const getCachedArtists = unstable_cache(
  (q: string) =>
    prisma.artist.findMany({
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
    }),
  ['artists-list'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

const getCachedFeaturedRows = unstable_cache(
  () =>
    prisma.artwork.findMany({
      where: {
        AND: [hasImage, { OR: FEATURED_ARTIST_WORKS.map((work) => ({ title: work.title, artist: { name: work.artist } })) }],
      },
      select: { image_local_path: true, image_url: true, title: true, artist: { select: { name: true } } },
      orderBy: { id: 'asc' },
    }),
  ['artists-featured-rows'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q ?? ''

  const [session, t, locale, artists, featuredRows] = await Promise.all([
    getServerSession(authOptions),
    getTranslations('Artists'),
    getLocale(),
    getCachedArtists(q),
    getCachedFeaturedRows(),
  ])

  const featuredImages = new Map(
    FEATURED_ARTIST_WORKS.map((work) => [
      work.artist,
      featuredRows.find((row) => row.artist.name === work.artist && row.title === work.title),
    ])
  )

  // Haal seen-counts op voor ingelogde gebruiker
  const seenCounts: Record<number, number> = {}
  if (session?.user?.id) {
    // One relation query is substantially cheaper than one count query per artist.
    const seenArtworkRows = await prisma.seen.findMany({
      where: { userId: session.user.id, artwork: primaryCatalogue },
      select: { artwork: { select: { artistId: true } } },
    })
    for (const row of seenArtworkRows) {
      seenCounts[row.artwork.artistId] = (seenCounts[row.artwork.artistId] ?? 0) + 1
    }
  }

  return (
    <div className="pb-12">
      <div className="mb-9 grid gap-5 md:grid-cols-[1fr_320px] md:items-end">
        <div><p className="eyebrow mb-3">{t('eyebrow')}</p><h1 className="font-display text-6xl font-medium leading-none text-stone-900 sm:text-7xl">{t('title')}</h1><p className="mt-4 max-w-xl text-stone-500">{t('intro')}</p></div>
        <span className="justify-self-start rounded-full bg-[#ed694c] px-4 py-2 text-sm font-semibold text-white md:justify-self-end">{t('count', { count: artists.length })}</span>
      </div>

      <ArtistsSearch defaultValue={q} />

      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
