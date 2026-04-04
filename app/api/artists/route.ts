import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { slugify } from '@/lib/utils'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { nationality: { contains: q } },
          ],
        }
      : undefined,
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(artists)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const data = await req.json()
  const artist = await prisma.artist.create({
    data: { ...data, slug: slugify(data.name) },
  })
  return NextResponse.json(artist, { status: 201 })
}
