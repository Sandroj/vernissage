import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artistNames }: { artistNames: string[] } = await req.json()

  // Verwijder oude stemmen van deze gebruiker
  await prisma.artistVote.deleteMany({ where: { userId: session.user.id } })

  // Sla nieuwe stemmen op
  await prisma.artistVote.createMany({
    data: artistNames.map((artistName) => ({
      userId: session.user.id,
      artistName,
    })),
  })

  return NextResponse.json({ saved: artistNames.length })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([])

  const votes = await prisma.artistVote.findMany({
    where: { userId: session.user.id },
    select: { artistName: true },
  })

  return NextResponse.json(votes.map((v) => v.artistName))
}
