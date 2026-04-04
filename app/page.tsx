import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { Button } from '@/components/ui/button'
import { ArrowRight, Palette } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const artists = await prisma.artist.findMany({
    include: { _count: { select: { artworks: true } } },
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
        where: { userId: session.user.id, artwork: { artistId: artist.id } },
      })
    }
    const recent = await prisma.seen.findMany({
      where: { userId: session.user.id },
      include: { artwork: { include: { artist: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentSeen.push(...(recent as any[]))
  }

  const totalSeen = Object.values(seenCounts).reduce((a, b) => a + b, 0)
  const totalArtworks = artists.reduce((a, b) => a + b._count.artworks, 0)

  return (
    <div className="space-y-12">
      {/* Hero section */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
          {session?.user?.name
            ? `Hallo, ${session.user.name.split(' ')[0]}`
            : 'ArtTracker'
          }
        </h1>
        <p className="text-zinc-400 text-lg">
          {session
            ? totalSeen > 0
              ? `Jij hebt ${totalSeen} van ${totalArtworks} werken gezien.`
              : 'Begin met het bijhouden van je kunstbezoeken.'
            : 'Bijhouden welke kunstwerken je ooit hebt gezien.'
          }
        </p>
      </div>

      {/* Not logged in CTA */}
      {!session && (
        <div className="bg-gradient-to-r from-indigo-950/60 to-violet-950/60 rounded-2xl p-8 border border-indigo-500/20 text-center">
          <Palette size={40} className="text-indigo-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Maak een gratis account aan</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
            Houd bij welke kunstwerken je hebt gezien, beoordeel ze en deel je voortgang.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login?mode=register">
              <Button className="bg-indigo-600 hover:bg-indigo-500 border-0">Account aanmaken</Button>
            </Link>
            <Link href="/artists">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                Bekijk kunstenaars
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Artists progress */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-white">Kunstenaars</h2>
          <Link href="/artists" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-indigo-400 transition-colors">
            Alle kunstenaars <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {artists.map((artist) => {
            const seen = seenCounts[artist.id] ?? 0
            const total = artist._count.artworks
            const pct = total > 0 ? (seen / total) * 100 : 0
            return (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="group flex items-center gap-4 bg-zinc-900/80 rounded-xl p-4 border border-white/5 hover:border-white/10 hover:bg-zinc-900 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm group-hover:text-indigo-200 transition-colors">{artist.name}</span>
                    <span className="text-zinc-500 text-xs ml-4">{seen}/{total}</span>
                  </div>
                  <ProgressBar value={pct} seen={seen} total={total} animate={false} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent seen */}
      {recentSeen.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-5">Recent gezien</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {recentSeen.map((s) => (
              <Link key={s.id} href={`/artworks/${s.artworkId}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/5 group-hover:ring-indigo-500/40 transition-all">
                  <img
                    src={s.artwork.image_local_path ?? s.artwork.image_url ?? '/placeholder.jpg'}
                    alt={s.artwork.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate group-hover:text-zinc-300 transition-colors">{s.artwork.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
