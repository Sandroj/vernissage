jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn().mockResolvedValue({ passwordChangedAt: null }) } },
}))

import { authOptions } from '@/lib/auth'

describe('jwt callback', () => {
  it('applies a name update triggered by useSession().update()', async () => {
    const token = { id: 'user-1', name: 'Old Name', pwv: 0 }
    // @ts-expect-error - partial params, matches what NextAuth actually passes on an update trigger
    const result = await authOptions.callbacks!.jwt!({ token, trigger: 'update', session: { name: 'New Name' } })
    expect(result.name).toBe('New Name')
  })

  it('leaves the name untouched on a plain token refresh', async () => {
    const token = { id: 'user-1', name: 'Old Name', pwv: 0 }
    // @ts-expect-error - partial params
    const result = await authOptions.callbacks!.jwt!({ token })
    expect(result.name).toBe('Old Name')
  })
})
