import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [user, seenCount, seenRecords, recentSeen] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, seenPublic: true, createdAt: true },
    }),
    prisma.seen.count({ where: { userId: session.user.id } }),
    prisma.seen.findMany({
      where: { userId: session.user.id },
      orderBy: { dateSeen: 'desc' },
      select: {
        artwork: {
          select: {
            id: true,
            title: true,
            image_local_path: true,
            image_url: true,
            artist: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.seen.findMany({
      where: { userId: session.user.id },
      orderBy: { dateSeen: 'desc' },
      take: 8,
      select: {
        id: true,
        dateSeen: true,
        artwork: {
          select: {
            id: true,
            title: true,
            image_local_path: true,
            image_url: true,
            artist: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const seenByArtist = Object.values(seenRecords.reduce<Record<number, {
    artist: { id: number; name: string; slug: string }
    artworks: { id: number; title: string; image_local_path: string | null; image_url: string | null }[]
  }>>((groups, record) => {
    const artist = record.artwork.artist
    groups[artist.id] ??= { artist, artworks: [] }
    groups[artist.id].artworks.push({ id: record.artwork.id, title: record.artwork.title, image_local_path: record.artwork.image_local_path, image_url: record.artwork.image_url })
    return groups
  }, {})).sort((a, b) => a.artist.name.localeCompare(b.artist.name))

  return <ProfileClient user={user!} seenCount={seenCount} seenByArtist={seenByArtist} recentSeen={recentSeen} />
}
