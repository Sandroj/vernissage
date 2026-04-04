import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const artists = await prisma.artist.findMany({
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' },
  })

  const seenCounts: Record<number, number> = {}
  const recentSeen: any[] = []

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
      take: 6,
    })
    recentSeen.push(...recent)
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {session?.user?.name ? `Hallo, ${session.user.name.split(' ')[0]}` : 'ArtTracker'}
        </h1>
        <p className="text-slate-400">
          {session ? 'Jouw kunstvoortgang in één oogopslag.' : 'Log in om je voortgang bij te houden.'}
        </p>
      </div>

      {/* Kunstenaars voortgang */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kunstenaars</h2>
          <Link href="/artists">
            <Button variant="ghost" size="sm" className="text-slate-400">Alle kunstenaars →</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {artists.map((artist) => {
            const seen = seenCounts[artist.id] ?? 0
            const total = artist._count.artworks
            const pct = total > 0 ? (seen / total) * 100 : 0
            return (
              <Link key={artist.id} href={`/artists/${artist.slug}`} className="block bg-slate-900 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{artist.name}</span>
                  <span className="text-slate-400 text-sm">{seen}/{total}</span>
                </div>
                <ProgressBar value={pct} seen={seen} total={total} animate={false} />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent gezien */}
      {recentSeen.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent gezien</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentSeen.map((s) => (
              <Link key={s.id} href={`/artworks/${s.artworkId}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                  <img
                    src={s.artwork.image_local_path ?? s.artwork.image_url ?? '/placeholder.jpg'}
                    alt={s.artwork.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">{s.artwork.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!session && (
        <div className="text-center py-12 border border-slate-800 rounded-xl">
          <p className="text-slate-400 mb-4">Log in om je voortgang bij te houden.</p>
          <Link href="/login"><Button>Inloggen of registreren</Button></Link>
        </div>
      )}
    </div>
  )
}
