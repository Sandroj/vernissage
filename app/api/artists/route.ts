import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'
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
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })

  const { name, nationality } = await req.json()
  if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'name is verplicht' }, { status: 400 })
  const artist = await prisma.artist.create({
    data: { name: name.trim(), slug: slugify(name), ...(typeof nationality === 'string' ? { nationality } : {}) },
  })
  return NextResponse.json(artist, { status: 201 })
}
