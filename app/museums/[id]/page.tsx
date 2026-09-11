import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MuseumDetailClient from './museum-detail-client'
import { getTranslations } from 'next-intl/server'

export default async function MuseumDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  const t = await getTranslations('Museums')
  const museumId = Number(params.id)
  if (isNaN(museumId)) notFound()

  const museum = await prisma.museum.findUnique({
    where: { id: museumId },
    include: {
      artworks: {
        include: { artist: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
      },
    },
  })

  if (!museum) notFound()

  const seenRecords = session?.user?.id
    ? await prisma.seen.findMany({
        where: {
          userId: session.user.id,
          artwork: { museumId },
        },
      })
    : []

  const seenMap = Object.fromEntries(seenRecords.map((s) => [s.artworkId, s]))

  // Unieke kunstenaars gesorteerd op aantal werken
  const artistMap = new Map<number, { name: string; slug: string; count: number }>()
  for (const a of museum.artworks) {
    if (!artistMap.has(a.artist.id)) {
      artistMap.set(a.artist.id, { name: a.artist.name, slug: a.artist.slug, count: 0 })
    }
    artistMap.get(a.artist.id)!.count++
  }
  const artists = Array.from(artistMap.values()).sort((a, b) => b.count - a.count)

  return (
    <div>
      {/* Back */}
      <Link
        href="/museums"
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> {t('backToMuseums')}
      </Link>

      <MuseumDetailClient
        museum={museum}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seenMap={seenMap as any}
        isLoggedIn={!!session?.user}
        artists={artists}
      />
    </div>
  )
}
