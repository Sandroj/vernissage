import { isActiveSubscriptionStatus } from '@/lib/entitlement'

describe('isActiveSubscriptionStatus', () => {
  it('grants access for active and trialing subscriptions', () => {
    expect(isActiveSubscriptionStatus('active')).toBe(true)
    expect(isActiveSubscriptionStatus('trialing')).toBe(true)
  })
  it('revokes access for canceled, past_due, unpaid and incomplete subscriptions', () => {
    expect(isActiveSubscriptionStatus('canceled')).toBe(false)
    expect(isActiveSubscriptionStatus('past_due')).toBe(false)
    expect(isActiveSubscriptionStatus('unpaid')).toBe(false)
    expect(isActiveSubscriptionStatus('incomplete')).toBe(false)
    expect(isActiveSubscriptionStatus('incomplete_expired')).toBe(false)
  })
})
