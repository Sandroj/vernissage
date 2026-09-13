import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [user, seenCount, voteCount, recentSeen] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, seenPublic: true, createdAt: true },
    }),
    prisma.seen.count({ where: { userId: session.user.id } }),
    prisma.artistVote.count({ where: { userId: session.user.id } }),
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

  return <ProfileClient user={user!} seenCount={seenCount} voteCount={voteCount} recentSeen={recentSeen} />
}
