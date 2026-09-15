import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'

export async function GET(req: Request) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])
  const rows = await prisma.artwork.findMany({
    where: { OR: [{ title: { contains: q } }, { catalogue_id: { contains: q } }, { artist: { name: { contains: q } } }] },
    select: { id: true, title: true, year_start: true, artist: { select: { name: true } } },
    orderBy: [{ title: 'asc' }],
    take: 25,
  })
  return NextResponse.json(rows)
}
