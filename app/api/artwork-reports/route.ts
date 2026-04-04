import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// For now, store reports as a simple text file (no schema migration needed)
// In a real app you'd add a Report model to Prisma
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId, message } = await req.json()

  // Log the report (in production, save to DB)
  console.log(`[REPORT] User ${session.user.email} reports artwork ${artworkId}: ${message}`)

  return NextResponse.json({ ok: true })
}
