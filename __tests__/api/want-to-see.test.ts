/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { wantToSee: { upsert: jest.fn(), deleteMany: jest.fn() } },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { POST, DELETE } from '@/app/api/want-to-see/route'

const req = (method: string, body: object) =>
  new Request('http://localhost/api/want-to-see', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('/api/want-to-see', () => {
  afterEach(() => jest.clearAllMocks())

  it('rejects anonymous users and invalid ids', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    expect((await POST(req('POST', { artworkId: 1 }))).status).toBe(401)
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1' } })
    expect((await POST(req('POST', { artworkId: 'x' }))).status).toBe(400)
    expect(prisma.wantToSee.upsert).not.toHaveBeenCalled()
  })

  it('adds and removes only for the session user', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1' } })
    expect((await POST(req('POST', { artworkId: 7 }))).status).toBe(201)
    expect((prisma.wantToSee.upsert as jest.Mock).mock.calls[0][0].create).toEqual({ userId: 'u1', artworkId: 7 })
    await DELETE(req('DELETE', { artworkId: 7 }))
    expect(prisma.wantToSee.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', artworkId: 7 } })
  })
})
