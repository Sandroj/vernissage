import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { isActiveSubscriptionStatus } from '@/lib/entitlement'
import type Stripe from 'stripe'

// POST /api/billing/webhook
// Stripe-webhook. Plan §7-eisen: handtekening over de ongewijzigde raw body,
// duurzame opslag vóór verwerking (dedupe op event-id, dus dubbele/uit-
// volgorde afgeleverde events zijn onschadelijk), en scheiding tussen
// betaalhistorie (Subscription) en featuretoegang (Entitlement).
export async function POST(req: Request) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Betalen is nog niet geconfigureerd.' }, { status: 503 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Geen handtekening' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Ongeldige handtekening' }, { status: 400 })
  }

  // Voorkomt dat een testmodus-secret per ongeluk live events accepteert (of
  // andersom) als de verkeerde webhook-secret ergens is ingevuld.
  const isLiveKey = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_')
  if (event.livemode !== isLiveKey) {
    return NextResponse.json({ error: 'Test/live-context komt niet overeen' }, { status: 400 })
  }

  try {
    await prisma.billingEvent.create({
      data: { stripeEventId: event.id, type: event.type, payload: rawBody },
    })
  } catch {
    // Unique-constraint op stripeEventId: dit event is al eerder verwerkt.
    return NextResponse.json({ received: true, duplicate: true })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    default:
      // Andere events (bv. checkout.session.completed, invoice.*) staan al
      // in BillingEvent voor reconciliatie; de subscription-events hierboven
      // zijn de brontabel voor Entitlement, dus geen dubbele afhandeling.
      break
  }

  return NextResponse.json({ received: true })
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  })
  if (!billingCustomer) return

  const currentPeriodEnd = new Date(subscription.items.data[0]?.current_period_end * 1000)

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status: subscription.status,
      stripePriceId: subscription.items.data[0]?.price.id ?? '',
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      billingCustomerId: billingCustomer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id ?? '',
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  const active = isActiveSubscriptionStatus(subscription.status)
  await prisma.entitlement.upsert({
    where: { userId: billingCustomer.userId },
    update: { plan: 'plus', active, expiresAt: currentPeriodEnd },
    create: { userId: billingCustomer.userId, plan: 'plus', active, expiresAt: currentPeriodEnd },
  })
}
