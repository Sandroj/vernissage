import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, seenPublic: true, createdAt: true },
  })

  const seenCount = await prisma.seen.count({ where: { userId: session.user.id } })
  const hasPassword = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  }).then((u) => !!u?.password)

  return <ProfileClient user={user!} seenCount={seenCount} hasPassword={hasPassword} />
}
