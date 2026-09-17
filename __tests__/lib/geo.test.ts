import { haversineKm } from '@/lib/geo'

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(52.37, 4.89, 52.37, 4.89)).toBeCloseTo(0, 5)
  })
  it('matches the known Amsterdam-Paris distance (~430km)', () => {
    const km = haversineKm(52.3676, 4.9041, 48.8566, 2.3522)
    expect(km).toBeGreaterThan(420)
    expect(km).toBeLessThan(440)
  })
})
