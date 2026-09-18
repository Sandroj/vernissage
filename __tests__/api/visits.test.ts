/**
 * @jest-environment node
 */
// Route handlers use the Web Request/Response globals, which the jsdom
// environment (this project's default) doesn't provide.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    seen: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/entitlement', () => ({ hasActiveEntitlement: jest.fn() }))
// deletePhotoIfOrphaned is mocked as a whole below, so its real internals
// (which call prisma.seen.findFirst) never execute in this file — no need
// to add that method to the prisma mock above.
jest.mock('@/lib/photo-storage', () => ({
  storePhoto: jest.fn(),
  signedPhotoUrl: jest.fn((key: string) => Promise.resolve(key)),
  deletePhotoIfOrphaned: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'
import { POST, GET } from '@/app/api/visits/route'
import { DELETE } from '@/app/api/visits/[id]/route'

const session = { user: { id: 'user-1' } }

function postRequest(body: object) {
  return new Request('http://localhost/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getRequest(artworkId: number) {
  return new Request(`http://localhost/api/visits?artworkId=${artworkId}`)
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

  it('uploads a data: photo_url and stores the returned key', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    const visit = { id: 11, userId: 'user-1', artworkId: 1, dateSeen: new Date('2026-01-01T00:00:00Z'), locationSeen: null, notes: null, rating: null, photo_url: 'photos/user-1/new.jpg' }
    ;(prisma.visit.create as jest.Mock).mockResolvedValue(visit)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({})

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(201)
    expect(storePhoto).toHaveBeenCalledWith('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    const createArgs = (prisma.visit.create as jest.Mock).mock.calls[0][0]
    expect(createArgs.data.photo_url).toBe('photos/user-1/new.jpg')
  })

  it('rejects a non-data:, non-null photo_url with 400', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'https://evil.example/x.jpg' }))

    expect(res.status).toBe(400)
    expect(prisma.visit.create).not.toHaveBeenCalled()
  })

  it('cleans up a photo that was on Seen but is being overwritten by this visit', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/old-seen.jpg' })
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    const visit = { id: 11, userId: 'user-1', artworkId: 1, dateSeen: new Date('2026-01-01T00:00:00Z'), locationSeen: null, notes: null, rating: null, photo_url: 'photos/user-1/new.jpg' }
    ;(prisma.visit.create as jest.Mock).mockResolvedValue(visit)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({})

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/old-seen.jpg')
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

  it('cleans up the deleted visit\'s photo when nothing else references it', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.visit.delete as jest.Mock).mockResolvedValue({ id: 10, artworkId: 1, userId: 'user-1', photo_url: 'photos/user-1/deleted.jpg' })
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(null)

    await DELETE(new Request('http://localhost/api/visits/10', { method: 'DELETE' }), { params: { id: '10' } })

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/deleted.jpg')
  })

  it('cleans up the deleted visit\'s photo after resyncing Seen to another visit', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.visit.delete as jest.Mock).mockResolvedValue({
      id: 10,
      artworkId: 1,
      userId: 'user-1',
      photo_url: 'photos/user-1/deleted.jpg',
    })
    const remaining = {
      id: 9,
      dateSeen: new Date('2025-06-01T00:00:00Z'),
      locationSeen: null,
      notes: null,
      rating: null,
      photo_url: 'photos/user-1/still-here.jpg',
    }
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(remaining)
    ;(prisma.seen.update as jest.Mock).mockResolvedValue({})

    await DELETE(new Request('http://localhost/api/visits/10', { method: 'DELETE' }), { params: { id: '10' } })

    // Verify resync happened
    expect(prisma.seen.update).toHaveBeenCalledTimes(1)
    expect(prisma.seen.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ photo_url: 'photos/user-1/still-here.jpg' }),
    }))

    // Verify cleanup called with DELETED visit's photo, not the remaining one
    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/deleted.jpg')

    // Verify order: resync must happen before cleanup
    const seenUpdateOrder = (prisma.seen.update as jest.Mock).mock.invocationCallOrder[0]
    const cleanupOrder = (deletePhotoIfOrphaned as jest.Mock).mock.invocationCallOrder[0]
    expect(seenUpdateOrder).toBeLessThan(cleanupOrder)
  })
})

describe('GET /api/visits', () => {
  afterEach(() => jest.clearAllMocks())

  it('signs each visit\'s photo_url before returning', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.visit.findMany as jest.Mock).mockResolvedValue([
      { id: 1, dateSeen: new Date(), locationSeen: null, photo_url: 'photos/user-1/a.jpg' },
    ])
    ;(signedPhotoUrl as jest.Mock).mockResolvedValue('https://signed.example/a.jpg')

    const res = await GET(getRequest(1))
    const body = await res.json()

    expect(signedPhotoUrl).toHaveBeenCalledWith('photos/user-1/a.jpg')
    expect(body[0].photo_url).toBe('https://signed.example/a.jpg')
  })
})
