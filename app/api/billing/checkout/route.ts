import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

// POST /api/billing/checkout
// Maakt een Stripe Checkout-sessie voor het jaarabonnement van de ingelogde
// gebruiker. Zie plan §7: servergestuurde koppeling aan User-id (nooit alleen
// op e-mailadres), idempotency key, geen dubbele actieve abonnementen.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const stripe = getStripe()
  const priceId = process.env.STRIPE_PRICE_ID_PLUS_YEARLY
  if (!stripe || !priceId) {
    return NextResponse.json({ error: 'Betalen is nog niet geconfigureerd.' }, { status: 503 })
  }

  const userId = session.user.id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { billingCustomer: { include: { subscriptions: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Account niet gevonden' }, { status: 404 })

  const existingActive = user.billingCustomer?.subscriptions.find(
    (s) => s.status === 'active' || s.status === 'trialing'
  )
  if (existingActive) {
    return NextResponse.json({ error: 'Je hebt al een actief abonnement.' }, { status: 409 })
  }

  let stripeCustomerId = user.billingCustomer?.stripeCustomerId
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    })
    stripeCustomerId = customer.id
    await prisma.billingCustomer.upsert({
      where: { userId },
      update: { stripeCustomerId },
      create: { userId, stripeCustomerId },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const checkoutSession = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?checkout=success`,
      cancel_url: `${baseUrl}/profile?checkout=cancelled`,
    },
    // Voorkomt een dubbele sessie/dubbele betaling bij een dubbelklik of
    // netwerkretry op dezelfde actie.
    { idempotencyKey: `checkout-${userId}-${priceId}` }
  )

  if (!checkoutSession.url) {
    return NextResponse.json({ error: 'Kon geen checkout-sessie aanmaken.' }, { status: 502 })
  }
  return NextResponse.json({ url: checkoutSession.url })
}
