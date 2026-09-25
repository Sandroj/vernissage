import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Privé verlanglijst: POST zet een werk erop, DELETE haalt het eraf.
async function parse(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 }) }
  const { artworkId } = await req.json().catch(() => ({}))
  const id = Number(artworkId)
  if (!Number.isInteger(id) || id <= 0) return { error: NextResponse.json({ error: 'Ongeldig werk' }, { status: 400 }) }
  return { userId: session.user.id, artworkId: id }
}

export async function POST(req: Request) {
  const p = await parse(req)
  if ('error' in p) return p.error
  await prisma.wantToSee.upsert({
    where: { userId_artworkId: { userId: p.userId, artworkId: p.artworkId } },
    update: {},
    create: { userId: p.userId, artworkId: p.artworkId },
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const p = await parse(req)
  if ('error' in p) return p.error
  await prisma.wantToSee.deleteMany({ where: { userId: p.userId, artworkId: p.artworkId } })
  return NextResponse.json({ ok: true })
}
