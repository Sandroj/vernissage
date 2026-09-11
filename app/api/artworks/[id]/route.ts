import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ARTWORK_TYPES = ['painting', 'drawing', 'watercolor', 'work on paper', 'print'] as const

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { type_normalized } = await req.json()
  if (!ARTWORK_TYPES.includes(type_normalized)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 })
  }

  const artwork = await prisma.artwork.update({
    where: { id: parseInt(params.id) },
    data: { type_normalized },
    select: { id: true, type_normalized: true },
  })
  return NextResponse.json(artwork)
}
