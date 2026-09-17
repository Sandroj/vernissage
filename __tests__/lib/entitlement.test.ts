jest.mock('@/lib/prisma', () => ({
  prisma: { entitlement: { findUnique: jest.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { isActiveSubscriptionStatus, hasActiveEntitlement } from '@/lib/entitlement'

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

describe('hasActiveEntitlement', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns true when the entitlement row is active', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue({ active: true })
    expect(await hasActiveEntitlement('user-1')).toBe(true)
  })

  it('returns false when the entitlement row is inactive', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue({ active: false })
    expect(await hasActiveEntitlement('user-1')).toBe(false)
  })

  it('returns false when no entitlement row exists', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue(null)
    expect(await hasActiveEntitlement('user-1')).toBe(false)
  })
})
