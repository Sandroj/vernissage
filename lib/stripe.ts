import Stripe from 'stripe'

const globalForStripe = globalThis as unknown as { stripe?: Stripe }

// Lazy: alleen instantiëren wanneer een billingroute 'm daadwerkelijk
// aanroept, zodat de rest van de app (en de build) niet crasht zolang
// STRIPE_SECRET_KEY nog niet is ingesteld.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!globalForStripe.stripe) globalForStripe.stripe = new Stripe(key)
  return globalForStripe.stripe
}
