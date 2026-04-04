import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { name, seenPublic } = await req.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, seenPublic },
    select: { id: true, name: true, seenPublic: true },
  })

  return NextResponse.json(user)
}
