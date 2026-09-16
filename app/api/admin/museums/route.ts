import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'

export async function GET() {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  return NextResponse.json(await prisma.museum.findMany({ select: { id: true, name: true, city: true, country: true }, orderBy: [{ name: 'asc' }], take: 1000 }))
}
