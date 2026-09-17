import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

// POST /api/billing/portal
// Stripe Customer Portal-sessie voor de ingelogde gebruiker. De klant-id komt
// altijd uit de eigen sessie, nooit uit request-input — user A kan zo nooit
// bij de portal van user B (plan §7-testmatrix).
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Betalen is nog niet geconfigureerd.' }, { status: 503 })

  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { userId: session.user.id },
  })
  if (!billingCustomer) return NextResponse.json({ error: 'Geen abonnement gevonden.' }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: billingCustomer.stripeCustomerId,
    return_url: `${baseUrl}/profile`,
  })

  return NextResponse.json({ url: portalSession.url })
}
