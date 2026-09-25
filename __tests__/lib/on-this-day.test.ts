import { onThisDay } from '@/lib/on-this-day'

describe('onThisDay', () => {
  const now = new Date('2026-09-25T10:00:00Z')

  it('matches the same calendar day in earlier years only', () => {
    const rows = [
      { id: 1, dateSeen: '2025-09-25T10:00:00Z' },
      { id: 2, dateSeen: '2023-09-25T10:00:00Z' },
      { id: 3, dateSeen: '2026-09-25T08:00:00Z' }, // vandaag zelf: geen herinnering
      { id: 4, dateSeen: '2025-09-24T10:00:00Z' },
    ]
    expect(onThisDay(rows, now).map((r) => [r.id, r.yearsAgo])).toEqual([[1, 1], [2, 3]])
  })

  it('uses Amsterdam calendar days, not UTC', () => {
    // 22:30Z op 24 sep = 00:30 op 25 sep in Amsterdam (zomertijd)
    expect(onThisDay([{ dateSeen: '2025-09-24T22:30:00Z' }], now)).toHaveLength(1)
  })
})
