// Welke Stripe-subscriptionstatussen recht geven op Plus-features. Opzeggen
// (cancel_at_period_end) laat de betaalde periode intact — Stripe zet de
// status pas op 'canceled' ná afloop van de termijn, dus dit hoeft hier geen
// aparte state te zijn.
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export function isActiveSubscriptionStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status)
}
