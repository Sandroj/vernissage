import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId, message } = await req.json()
  if (!artworkId || !message?.trim()) {
    return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 })
  }

  const report = await prisma.report.create({
    data: {
      userId: session.user.id,
      artworkId: Number(artworkId),
      message: message.trim(),
    },
  })

  return NextResponse.json({ ok: true, id: report.id })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const artworkId = searchParams.get('artworkId')

  const reports = await prisma.report.findMany({
    where: artworkId ? { artworkId: Number(artworkId) } : { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { artwork: { select: { title: true } } },
  })

  return NextResponse.json(reports)
}
