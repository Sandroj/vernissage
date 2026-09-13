import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const museums = await prisma.museum.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { city: { contains: q } },
            { country: { contains: q } },
          ],
        }
      : undefined,
    take: 30,
    orderBy: [{ country: 'asc' }, { name: 'asc' }, { city: 'asc' }],
  })

  return NextResponse.json(museums)
}
