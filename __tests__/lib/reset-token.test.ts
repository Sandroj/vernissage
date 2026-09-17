import { hashResetToken, shouldExposeResetUrl } from '@/lib/reset-token'

describe('hashResetToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashResetToken('abc')).toBe(hashResetToken('abc'))
  })
  it('differs for different inputs', () => {
    expect(hashResetToken('abc')).not.toBe(hashResetToken('abd'))
  })
  it('never returns the raw token', () => {
    expect(hashResetToken('super-secret-token')).not.toContain('super-secret-token')
  })
})

describe('shouldExposeResetUrl', () => {
  it('hides the reset link in production', () => {
    expect(shouldExposeResetUrl('production')).toBe(false)
  })
  it('exposes the reset link outside production', () => {
    expect(shouldExposeResetUrl('development')).toBe(true)
    expect(shouldExposeResetUrl('test')).toBe(true)
    expect(shouldExposeResetUrl(undefined)).toBe(true)
  })
})
