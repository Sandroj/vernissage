import { Prisma } from '@prisma/client'
import { registerArtists } from '@/lib/prisma'

// Gedeeld tussen app/artists/[slug]/page.tsx (eerste 200 werken, server-render)
// en app/api/artists/[slug]/artworks/route.ts (volledige lijst, lazy geladen
// door de client) — zelfde selectie, zelfde filter, zodat beide responses
// naadloos in elkaar overvloeien voor ArtworkGrid.

export const currentLoan = { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }

export function catalogueWhereForSlug(slug: string) {
  return registerArtists.some((a) => a.slug === slug) ? { catalogue_id: { not: null } } : {}
}

// Alleen velden die ArtworkGrid/ArtworkCard daadwerkelijk gebruiken (filteren,
// facetten, zoeken, kaart-render) — bij artiesten met duizenden werken
// (Monet, Van Gogh) weegt elk ongebruikt veld hier mee in de payload van
// élk paginabezoek. De artwork-detailpagina haalt haar eigen volledige set
// op, dus niets gaat hier verloren.
export const artworkListSelect = {
  id: true,
  title: true,
  year_start: true,
  year_end: true,
  type_normalized: true,
  image_local_path: true,
  image_url: true,
  catalogue_id: true,
  jh_catalogue_id: true,
  alternate_titles: true,
  attribution_status: true,
  museum: { select: { id: true, name: true, city: true, country: true } },
  loans: {
    where: currentLoan,
    select: { toMuseum: { select: { name: true, city: true } } },
  },
  _count: { select: { seenBy: true } },
} satisfies Prisma.ArtworkSelect

export const artworkListOrderBy: Prisma.ArtworkOrderByWithRelationInput[] = [{ year_start: 'asc' }, { title: 'asc' }]

// Eerste page bij het openen van de kunstenaarspagina — zelfde grootte als
// ArtworkGrid's eigen PAGE_SIZE, zodat de eerste weergave al een volledige
// "pagina" toont en er geen rare sprong is voor de achtergrond-fetch klaar is.
export const INITIAL_ARTWORKS_TAKE = 200
