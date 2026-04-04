import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { works } = await req.json()
  if (!Array.isArray(works)) return NextResponse.json({ error: 'works moet een array zijn' }, { status: 400 })

  let imported = 0

  for (const work of works) {
    if (!work.artist || !work.title) continue

    let artist = await prisma.artist.findFirst({ where: { name: work.artist } })
    if (!artist) {
      artist = await prisma.artist.create({
        data: { name: work.artist, slug: slugify(work.artist) },
      })
    }

    let museumId: number | undefined
    if (work.holder_name && work.holder_city) {
      let museum = await prisma.museum.findFirst({
        where: { name: work.holder_name, city: work.holder_city },
      })
      if (!museum) {
        museum = await prisma.museum.create({
          data: { name: work.holder_name, city: work.holder_city, country: work.holder_country ?? 'Onbekend' },
        })
      }
      museumId = museum.id
    }

    const existing = await prisma.artwork.findFirst({
      where: { artistId: artist.id, title: work.title },
    })
    if (existing) continue

    await prisma.artwork.create({
      data: {
        artistId: artist.id,
        museumId,
        title: work.title,
        year_start: work.year_start ?? null,
        year_end: work.year_end ?? null,
        medium_raw: work.medium_raw ?? null,
        type_normalized: work.type_normalized ?? null,
        dimensions_raw: work.dimensions_raw ?? null,
        image_url: work.image_url ?? null,
        source_url: work.source_url ?? null,
      },
    })
    imported++
  }

  return NextResponse.json({ imported })
}
