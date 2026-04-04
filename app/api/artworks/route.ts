import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const artistId = searchParams.get('artistId')
  const type = searchParams.get('type')
  const city = searchParams.get('city')

  const artworks = await prisma.artwork.findMany({
    where: {
      ...(artistId ? { artistId: parseInt(artistId) } : {}),
      ...(type ? { type_normalized: type } : {}),
      ...(city ? { museum: { city: { contains: city } } } : {}),
    },
    include: {
      museum: true,
      _count: { select: { seenBy: true } },
    },
    orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(artworks)
}
