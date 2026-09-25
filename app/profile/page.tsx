import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { signPhotoUrls } from '@/lib/photo-storage'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [user, seenCount, seenRecords, recentSeen, seenPhotos, visitPhotos, wishlist] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, seenPublic: true, createdAt: true, password: true },
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
    prisma.seen.findMany({
      where: { userId: session.user.id, photo_url: { not: null } },
      orderBy: { dateSeen: 'desc' },
      take: 60,
      select: { id: true, dateSeen: true, photo_url: true, artwork: { select: { id: true, title: true } } },
    }),
    prisma.visit.findMany({
      where: { userId: session.user.id, photo_url: { not: null } },
      orderBy: { dateSeen: 'desc' },
      take: 60,
      select: { id: true, dateSeen: true, photo_url: true, artwork: { select: { id: true, title: true } } },
    }),
    prisma.wantToSee.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        artwork: {
          select: {
            id: true,
            title: true,
            image_local_path: true,
            image_url: true,
            artist: { select: { name: true } },
            museum: { select: { name: true, city: true } },
            loans: { where: { current: true, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }, take: 1, select: { toMuseum: { select: { name: true, city: true } } } },
          },
        },
      },
    }),
  ])

  // Visit photos win over a Seen row with the exact same photo_url — Seen is
  // a synced cache of the latest Visit for Plus users, so without this the
  // same photo would appear twice.
  const visitPhotoUrls = new Set(visitPhotos.map((v) => v.photo_url))
  const myPhotosUnsigned = [
    ...visitPhotos.map((v) => ({ id: `visit-${v.id}`, dateSeen: v.dateSeen, photo_url: v.photo_url!, artwork: v.artwork })),
    ...seenPhotos.filter((s) => !visitPhotoUrls.has(s.photo_url)).map((s) => ({ id: `seen-${s.id}`, dateSeen: s.dateSeen, photo_url: s.photo_url!, artwork: s.artwork })),
  ]
    .sort((a, b) => +new Date(b.dateSeen) - +new Date(a.dateSeen))
    .slice(0, 60)

  const myPhotos = await signPhotoUrls(myPhotosUnsigned)

  const seenByArtist = Object.values(seenRecords.reduce<Record<number, {
    artist: { id: number; name: string; slug: string }
    artworks: { id: number; title: string; image_local_path: string | null; image_url: string | null }[]
  }>>((groups, record) => {
    const artist = record.artwork.artist
    groups[artist.id] ??= { artist, artworks: [] }
    groups[artist.id].artworks.push({ id: record.artwork.id, title: record.artwork.title, image_local_path: record.artwork.image_local_path, image_url: record.artwork.image_url })
    return groups
  }, {})).sort((a, b) => a.artist.name.localeCompare(b.artist.name))

  const { password, ...userWithoutPassword } = user!
  return (
    <ProfileClient
      user={{ ...userWithoutPassword, hasPassword: !!password }}
      seenCount={seenCount}
      seenByArtist={seenByArtist}
      recentSeen={recentSeen}
      myPhotos={myPhotos}
      wishlist={wishlist.map(({ id, artwork: { loans, museum, ...artwork } }) => ({ id, artwork: { ...artwork, museum: loans[0]?.toMuseum ?? museum } }))}
    />
  )
}
