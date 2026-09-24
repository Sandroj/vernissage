import { NextResponse } from 'next/server'
import { prisma, CATALOG_REVALIDATE_SECONDS } from '@/lib/prisma'
import { catalogueWhereForSlug, artworkListSelect, artworkListOrderBy } from '@/lib/artist-catalogue'
import { unstable_cache } from 'next/cache'

// Volledige werklijst van een kunstenaar, los van de eerste 200 die
// app/artists/[slug]/page.tsx al server-side meestuurt — zie de toelichting
// daar. Client (artist-detail-client.tsx) haalt dit op na de eerste render.
const getCachedArtworks = unstable_cache(
  (slug: string) =>
    prisma.artwork.findMany({
      where: { artist: { slug }, ...catalogueWhereForSlug(slug) },
      select: artworkListSelect,
      orderBy: artworkListOrderBy,
    }),
  ['artist-full-artworks'],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
)

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const artworks = await getCachedArtworks(params.slug)
  return NextResponse.json({ artworks })
}
