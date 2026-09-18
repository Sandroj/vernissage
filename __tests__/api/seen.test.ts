/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    seen: { upsert: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/photo-storage', () => ({
  storePhoto: jest.fn(),
  signedPhotoUrl: jest.fn((key: string) => Promise.resolve(key)),
  deletePhotoIfOrphaned: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'
import { POST, DELETE, GET } from '@/app/api/seen/route'

const session = { user: { id: 'user-1' } }

function postRequest(body: object) {
  return new Request('http://localhost/api/seen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function deleteRequest(body: object) {
  return new Request('http://localhost/api/seen', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('leaves photo_url untouched when the field is omitted from the body', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', locationSeen: null, notes: null, rating: null }))

    expect(res.status).toBe(201)
    expect(storePhoto).not.toHaveBeenCalled()
    expect(prisma.seen.findUnique).not.toHaveBeenCalled()
    const upsertArgs = (prisma.seen.upsert as jest.Mock).mock.calls[0][0]
    expect(upsertArgs.update).not.toHaveProperty('photo_url')
    expect(upsertArgs.create).not.toHaveProperty('photo_url')
  })

  it('uploads a data: photo_url and stores the returned key', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(201)
    expect(storePhoto).toHaveBeenCalledWith('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    const upsertArgs = (prisma.seen.upsert as jest.Mock).mock.calls[0][0]
    expect(upsertArgs.update.photo_url).toBe('photos/user-1/new.jpg')
  })

  it('rejects a non-data:, non-null photo_url with 400', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'https://evil.example/x.jpg' }))

    expect(res.status).toBe(400)
    expect(storePhoto).not.toHaveBeenCalled()
  })

  it('cleans up the old photo when it is replaced by a new one', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/old.jpg' })
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/old.jpg')
  })

  it('does not attempt cleanup when the photo did not change', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: null })
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: null }))

    expect(deletePhotoIfOrphaned).not.toHaveBeenCalled()
  })

  it('returns 400 when storePhoto rejects the payload', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockRejectedValue(new Error('too big'))

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(400)
    expect(prisma.seen.upsert).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('cleans up the photo after deleting the row', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/gone.jpg' })
    ;(prisma.seen.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await DELETE(deleteRequest({ artworkId: 1 }))

    expect(res.status).toBe(200)
    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/gone.jpg')
  })

  it('skips cleanup when there was no photo', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: null })
    ;(prisma.seen.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    await DELETE(deleteRequest({ artworkId: 1 }))

    expect(deletePhotoIfOrphaned).not.toHaveBeenCalled()
  })
})

describe('GET /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('signs each row\'s photo_url before returning', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artworkId: 1, photo_url: 'photos/user-1/a.jpg' },
      { id: 2, artworkId: 2, photo_url: null },
    ])
    ;(signedPhotoUrl as jest.Mock).mockResolvedValue('https://signed.example/a.jpg')

    const res = await GET()
    const body = await res.json()

    expect(signedPhotoUrl).toHaveBeenCalledWith('photos/user-1/a.jpg')
    expect(body[0].photo_url).toBe('https://signed.example/a.jpg')
    expect(body[1].photo_url).toBeNull()
  })
})
