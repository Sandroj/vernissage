/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), delete: jest.fn() },
    billingCustomer: { findUnique: jest.fn(), deleteMany: jest.fn() },
    seen: { findMany: jest.fn(), deleteMany: jest.fn() },
    visit: { findMany: jest.fn(), deleteMany: jest.fn() },
    wantToSee: { findMany: jest.fn(), deleteMany: jest.fn() },
    artistVote: { deleteMany: jest.fn() },
    report: { deleteMany: jest.fn() },
    session: { deleteMany: jest.fn() },
    account: { deleteMany: jest.fn() },
    entitlement: { deleteMany: jest.fn() },
    subscription: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/stripe', () => ({ getStripe: jest.fn() }))
jest.mock('@/lib/photo-storage', () => ({ deletePhoto: jest.fn() }))
jest.mock('bcryptjs', () => ({ compare: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { getStripe } from '@/lib/stripe'
import { deletePhoto } from '@/lib/photo-storage'
import bcrypt from 'bcryptjs'
import { DELETE } from '@/app/api/account/route'

const session = { user: { id: 'user-1' } }

function deleteRequest(body?: object) {
  return new Request('http://localhost/api/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    ;(prisma.seen.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.visit.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.billingCustomer.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.$transaction as jest.Mock).mockResolvedValue([])
    ;(getStripe as jest.Mock).mockReturnValue(null)
  })
  afterEach(() => jest.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const res = await DELETE(deleteRequest())

    expect(res.status).toBe(401)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 403 and does not delete when the password is wrong', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: 'hashed' })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const res = await DELETE(deleteRequest({ password: 'wrong' }))

    expect(res.status).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deletes the account without a password check for OAuth-only users', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: null })

    const res = await DELETE(deleteRequest())

    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('cancels active Stripe subscriptions before deleting', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: null })
    ;(prisma.billingCustomer.findUnique as jest.Mock).mockResolvedValue({
      subscriptions: [{ stripeSubscriptionId: 'sub_123' }],
    })
    const cancel = jest.fn().mockResolvedValue({})
    ;(getStripe as jest.Mock).mockReturnValue({ subscriptions: { cancel } })

    const res = await DELETE(deleteRequest())

    expect(res.status).toBe(200)
    expect(cancel).toHaveBeenCalledWith('sub_123')
  })

  it('deletes every private photo referenced by Seen or Visit rows', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: null })
    ;(prisma.seen.findMany as jest.Mock).mockResolvedValue([{ photo_url: 'photos/user-1/a.jpg' }])
    ;(prisma.visit.findMany as jest.Mock).mockResolvedValue([{ photo_url: 'photos/user-1/b.jpg' }])

    await DELETE(deleteRequest())

    expect(deletePhoto).toHaveBeenCalledWith('photos/user-1/a.jpg')
    expect(deletePhoto).toHaveBeenCalledWith('photos/user-1/b.jpg')
  })
})
