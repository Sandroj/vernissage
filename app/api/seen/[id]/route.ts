import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const data = await req.json()
  const seen = await prisma.seen.update({
    where: { id: parseInt(params.id), userId: session.user.id },
    data: { ...data, dateSeen: data.dateSeen ? new Date(data.dateSeen) : undefined },
  })

  return NextResponse.json(seen)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  await prisma.seen.delete({
    where: { id: parseInt(params.id), userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
