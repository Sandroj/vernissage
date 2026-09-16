import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const artistId = searchParams.get('artistId')
  const type = searchParams.get('type')
  const city = searchParams.get('city')
  const take = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('limit') ?? '100', 10) || 100))
  const skip = Math.max(0, Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0)

  const artworks = await prisma.artwork.findMany({
    where: {
      ...(artistId ? { artistId: parseInt(artistId) } : {}),
      ...(type ? { type_normalized: { contains: type } } : {}),
      ...(city ? { museum: { city: { contains: city } } } : {}),
    },
    include: {
      museum: true,
      _count: { select: { seenBy: true } },
    },
    orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
    take,
    skip,
  })

  return NextResponse.json(artworks)
}
