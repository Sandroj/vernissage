import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DiscoverScreen from '@/components/discover-screen'

export default async function DiscoverPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const votes = await prisma.artistVote.findMany({
    where: { userId: session.user.id },
    select: { artistName: true },
  })

  return <DiscoverScreen initialVotes={votes.map((v) => v.artistName)} />
}
