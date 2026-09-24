import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Niet bevoegd' }, { status: 401 })
  }
  const result = await prisma.loan.updateMany({
    where: { current: true, endAt: { lt: new Date() } },
    data: { current: false },
  })
  return NextResponse.json({ expired: result.count })
}
