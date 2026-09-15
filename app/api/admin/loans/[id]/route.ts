import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminEmail } from '@/lib/admin'

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Ongeldige uitleen' }, { status: 400 })
  try {
    const loan = await prisma.loan.update({ where: { id }, data: { current: false, endAt: new Date() } })
    return NextResponse.json(loan)
  } catch {
    return NextResponse.json({ error: 'Uitleen niet gevonden.' }, { status: 404 })
  }
}
