/**
 * @jest-environment node
 */
// Route handlers use the Web Request/Response globals, which the jsdom
// environment (this project's default) doesn't provide.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
    seen: { upsert: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/entitlement', () => ({ hasActiveEntitlement: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { POST } from '@/app/api/visits/route'
import { DELETE } from '@/app/api/visits/[id]/route'

const session = { user: { id: 'user-1' } }

function postRequest(body: object) {
  return new Request('http://localhost/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/visits', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 403 and does not create a visit when not entitled', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(false)

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z' }))

    expect(res.status).toBe(403)
    expect(prisma.visit.create).not.toHaveBeenCalled()
  })

  it('returns 201 and creates the visit + upserts Seen when entitled', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    const visit = {
      id: 10,
      userId: 'user-1',
      artworkId: 1,
      dateSeen: new Date('2026-01-01T00:00:00Z'),
      locationSeen: null,
      notes: null,
      rating: null,
      photo_url: null,
    }
    ;(prisma.visit.create as jest.Mock).mockResolvedValue(visit)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({})

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z' }))

    expect(res.status).toBe(201)
    expect(prisma.visit.create).toHaveBeenCalledTimes(1)
    expect(prisma.seen.upsert).toHaveBeenCalledTimes(1)
  })
})

describe('DELETE /api/visits/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('resyncs Seen to the next-newest remaining visit after deleting the newest', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.visit.delete as jest.Mock).mockResolvedValue({ id: 10, artworkId: 1, userId: 'user-1' })
    const nextNewest = {
      id: 9,
      dateSeen: new Date('2025-06-01T00:00:00Z'),
      locationSeen: 'Rijksmuseum',
      notes: 'ok',
      rating: 4,
      photo_url: null,
    }
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(nextNewest)
    ;(prisma.seen.update as jest.Mock).mockResolvedValue({})

    const res = await DELETE(new Request('http://localhost/api/visits/10', { method: 'DELETE' }), { params: { id: '10' } })

    expect(res.status).toBe(200)
    expect(prisma.seen.update).toHaveBeenCalledTimes(1)
    expect(prisma.seen.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dateSeen: nextNewest.dateSeen, locationSeen: nextNewest.locationSeen }),
    }))
  })

  it('leaves Seen untouched when no visits remain after the delete', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.visit.delete as jest.Mock).mockResolvedValue({ id: 10, artworkId: 1, userId: 'user-1' })
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(null)

    const res = await DELETE(new Request('http://localhost/api/visits/10', { method: 'DELETE' }), { params: { id: '10' } })

    expect(res.status).toBe(200)
    expect(prisma.seen.update).not.toHaveBeenCalled()
  })
})
