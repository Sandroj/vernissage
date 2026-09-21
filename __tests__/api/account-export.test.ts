/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    seen: { findMany: jest.fn() },
    visit: { findMany: jest.fn() },
    artistVote: { findMany: jest.fn() },
    report: { findMany: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { GET } from '@/app/api/account/export/route'

describe('GET /api/account/export', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns a downloadable JSON export of the logged-in user\'s data', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: 'Test', email: 't@example.com', seenPublic: true, createdAt: new Date('2026-01-01') })
    ;(prisma.seen.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.visit.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.artistVote.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.report.findMany as jest.Mock).mockResolvedValue([])

    const res = await GET()
    const body = await res.json()

    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(body.profile.email).toBe('t@example.com')
    expect(prisma.seen.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }))
  })
})
