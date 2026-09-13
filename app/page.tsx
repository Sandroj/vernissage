import { prisma, hasImage, primaryCatalogue } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowUpRight, MapPin, Sparkles } from 'lucide-react'
import { proxyImg } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

// Handpicked instantly-recognizable works, one or two per artist, used for
// the homepage hero carousel instead of an arbitrary "first N by id" pick.
// Matched by title/artist rather than hardcoded ids, since ids can differ
// between dev.db and Turso (see HANDOFF valkuilen) — a title just quietly
// drops out of the carousel if it's ever renamed or removed.
const FEATURED_HERO_WORKS = [
  { artist: 'Vincent van Gogh', title: 'Sunflowers' },
  { artist: 'Johannes Vermeer', title: 'Girl with a Pearl Earring' },
  { artist: 'Claude Monet', title: 'Impression, sunrise' },
  { artist: 'Gustav Klimt', title: 'The Kiss' },
  { artist: 'Wassily Kandinsky', title: 'Composition VII' },
  { artist: 'Vincent van Gogh', title: "Vincent's Bedroom" },
  { artist: 'Johannes Vermeer', title: 'View of Delft' },
  { artist: 'Claude Monet', title: 'Water Lilies (Nympheas)' },
  { artist: 'Gustav Klimt', title: 'Portrait of Adele Bloch-Bauer I' },
  { artist: 'Wassily Kandinsky', title: 'Yellow-Red-Blue' },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('Home')

  const artists = await prisma.artist.findMany({
    include: {
      _count: { select: { artworks: { where: primaryCatalogue } } },
      artworks: {
        where: { AND: [primaryCatalogue, hasImage] },
        take: 2,
        orderBy: { id: 'asc' },
        select: { id: true, title: true, image_url: true, image_local_path: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const seenCounts: Record<number, number> = {}
  const recentSeen: Array<{
    id: number
    artworkId: number
    artwork: {
      id: number
      title: string
      image_local_path: string | null
      image_url: string | null
      artist: { name: string }
    }
  }> = []

  if (session?.user?.id) {
    for (const artist of artists) {
      seenCounts[artist.id] = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { artistId: artist.id, ...primaryCatalogue } },
      })
    }
    const recent = await prisma.seen.findMany({
      where: { userId: session.user.id, artwork: primaryCatalogue },
      include: { artwork: { include: { artist: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentSeen.push(...(recent as any[]))
  }

  const totalSeen = Object.values(seenCounts).reduce((a, b) => a + b, 0)
  const totalArtworks = artists.reduce((a, b) => a + b._count.artworks, 0)

  const featuredRows = await prisma.artwork.findMany({
    where: {
      AND: [hasImage, { OR: FEATURED_HERO_WORKS.map((f) => ({ title: f.title, artist: { name: f.artist } })) }],
    },
    select: { id: true, title: true, image_url: true, image_local_path: true, artist: { select: { name: true } } },
  })
  const heroWorks = FEATURED_HERO_WORKS
    .map((f) => featuredRows.find((r) => r.title === f.title && r.artist.name === f.artist))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ id: r.id, title: r.title, image_url: r.image_url, image_local_path: r.image_local_path, artist: r.artist.name }))
  const featuredArtistImages = new Map(
    artists.map((artist) => {
      const preferred = FEATURED_HERO_WORKS.find((work) => work.artist === artist.name)
      const row = preferred && featuredRows.find((candidate) => candidate.artist.name === artist.name && candidate.title === preferred.title)
      return [artist.name, row?.image_local_path ?? row?.image_url ?? artist.artworks[0]?.image_local_path ?? artist.artworks[0]?.image_url ?? null]
    })
  )
  // Keep four timed batches even if a configured title temporarily drops out;
  // modulo wrapping still guarantees three visible works per batch.
  const heroGroups = Array.from({ length: heroWorks.length > 0 ? 4 : 0 }, (_, groupIndex) =>
    Array.from({ length: 3 }, (_, workIndex) => heroWorks[(groupIndex * 3 + workIndex) % heroWorks.length])
  )

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#25231f] px-6 py-8 text-white sm:px-10 sm:py-12 lg:min-h-[570px] lg:px-14 lg:py-16">
        <div className="absolute -left-24 top-1/2 size-72 -translate-y-1/2 rounded-full bg-[#ed694c]/25 blur-3xl" />
        <div className="absolute right-20 top-0 size-72 rounded-full bg-[#5368df]/25 blur-3xl" />
        <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/75">
              <Sparkles size={13} className="text-[#f4b548]" /> {t('eyebrow')}
            </div>
            <h1 className="font-display text-[clamp(3.6rem,8vw,7.7rem)] font-medium leading-[.82] text-[#fffaf0]">
              {session?.user?.name ? t('hello', { name: session.user.name.split(' ')[0] }) : t('heroTitle')}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-white/62 sm:text-lg">
              {session ? (totalSeen > 0 ? t('progress', { seen: totalSeen, total: totalArtworks }) : t('start')) : t('heroText')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/artists"><Button className="h-12 rounded-full bg-[#ed694c] px-6 text-white hover:bg-[#db573c]">{t('explore')} <ArrowUpRight size={16} /></Button></Link>
              {!session && <Link href="/login?mode=register"><Button variant="outline" className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10">{t('ctaRegister')}</Button></Link>}
            </div>
            <div className="mt-12 flex gap-8 border-t border-white/12 pt-6 text-sm text-white/50">
              <div><span className="block text-2xl font-semibold text-white">{totalArtworks.toLocaleString()}</span>{t('works')}</div>
              <div><span className="block text-2xl font-semibold text-white">{artists.length}</span>{t('artists')}</div>
              <div><span className="block text-2xl font-semibold text-white">{totalSeen}</span>{t('seen')}</div>
            </div>
          </div>

          <div className="relative h-[370px] w-full overflow-hidden rounded-[1.6rem] sm:h-[430px]">
            {heroGroups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="hero-slide absolute inset-0 grid grid-cols-[1.25fr_.75fr] grid-rows-2 gap-2"
                style={{ animationDelay: `${-3 - ((heroGroups.length - groupIndex) % heroGroups.length) * 6}s` }}
              >
                {group.map((work, workIndex) => (
                  <Link
                    key={`${groupIndex}-${work.id}`}
                    href={`/artworks/${work.id}`}
                    className={`group relative min-h-0 overflow-hidden ${workIndex === 0 ? 'row-span-2' : ''}`}
                  >
                    <img
                      src={proxyImg(work.image_local_path ?? work.image_url) ?? '/placeholder.jpg'}
                      alt={work.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent ${workIndex === 0 ? 'p-5 pt-20' : 'p-3 pt-10'}`}>
                      <p className={`line-clamp-1 font-medium ${workIndex === 0 ? 'text-base' : 'text-xs'}`}>{work.title}</p>
                      <p className="line-clamp-1 text-[11px] text-white/60">{work.artist}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artists progress */}
      <section>
        <div className="mb-7 flex items-end justify-between">
          <div><p className="eyebrow mb-2">{t('collectionEyebrow')}</p><h2 className="font-display text-4xl font-medium text-stone-900 sm:text-5xl">{t('artists')}</h2></div>
          <Link href="/artists" className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#4256cc]">
            {t('allArtists')} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {artists.map((artist) => {
            const seen = seenCounts[artist.id] ?? 0
            const total = artist._count.artworks
            const pct = total > 0 ? (seen / total) * 100 : 0
            return (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="paper-card group flex items-center gap-4 rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                  {featuredArtistImages.get(artist.name) && <img src={proxyImg(featuredArtistImages.get(artist.name)) ?? ''} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-xl font-semibold text-stone-900 transition-colors group-hover:text-[#4256cc]">{artist.name}</span>
                    <span className="ml-4 text-xs text-stone-400">{seen}/{total}</span>
                  </div>
                  <ProgressBar value={pct} seen={seen} total={total} animate={false} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {!session && (
        <section className="grid gap-6 overflow-hidden rounded-[2rem] bg-[#e7e9fa] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="eyebrow mb-2">{t('ctaEyebrow')}</p><h2 className="font-display text-4xl font-medium text-stone-900">{t('ctaTitle')}</h2><p className="mt-3 max-w-2xl text-stone-600">{t('ctaText')}</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/login?mode=register"><Button className="h-11 rounded-full bg-[#4256cc] px-6 text-white hover:bg-[#3447b8]">{t('ctaRegister')}</Button></Link><Link href="/museums"><Button variant="outline" className="h-11 rounded-full border-black/10 bg-white/60 px-6 text-stone-800"><MapPin size={15} /> {t('ctaMuseums')}</Button></Link></div>
        </section>
      )}

      {/* Recent seen */}
      {recentSeen.length > 0 && (
        <section>
          <p className="eyebrow mb-2">{t('yourCollection')}</p><h2 className="font-display mb-6 text-4xl font-medium text-stone-900">{t('recentlySeen')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {recentSeen.map((s) => (
              <Link key={s.id} href={`/artworks/${s.artworkId}`} className="group">
                <div className="aspect-square overflow-hidden rounded-2xl bg-stone-200 shadow-sm ring-1 ring-black/5 transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                  <img
                    src={s.artwork.image_local_path ?? proxyImg(s.artwork.image_url) ?? '/placeholder.jpg'}
                    alt={s.artwork.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="mt-2 truncate text-xs text-stone-500 transition-colors group-hover:text-stone-900">{s.artwork.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
