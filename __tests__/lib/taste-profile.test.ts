import { tasteProfile } from '@/lib/taste-profile'

const row = (artist: string, museum: string | null, year: number | null, seen: string, approx = false) =>
  ({ dateSeen: seen, dateApprox: approx, artwork: { year_start: year, artist: { name: artist }, museum: museum ? { name: museum } : null } })

test('tasteProfile ranks and buckets', () => {
  const p = tasteProfile([
    row('Monet', 'Orsay', 1872, '2024-05-01'),
    row('Monet', 'Marmottan', 1878, '2025-05-01'),
    row('Vermeer', 'Mauritshuis', 1665, '2025-06-01'),
    row('Monet', null, null, '2025-07-01'),
  ])
  expect(p.artists).toEqual([{ label: 'Monet', count: 3 }, { label: 'Vermeer', count: 1 }])
  expect(p.museums.map((m) => m.label)).toEqual(['Marmottan', 'Mauritshuis', 'Orsay'])
  expect(p.decades).toEqual([{ label: '1660–69', count: 1 }, { label: '1870–79', count: 2 }])
  expect(p.years).toEqual([{ label: '2024', count: 1 }, { label: '2025', count: 3 }])
})

test('tasteProfile counts approximate-date entries for artists/decades but not the per-year bar', () => {
  const p = tasteProfile([
    row('Monet', 'Orsay', 1872, '2024-05-01'),
    row('Kahlo', 'Frida Kahlo Museum', 1940, '2025-01-01', true),
  ])
  expect(p.artists).toEqual([{ label: 'Kahlo', count: 1 }, { label: 'Monet', count: 1 }])
  expect(p.decades).toEqual([{ label: '1870–79', count: 1 }, { label: '1940–49', count: 1 }])
  expect(p.years).toEqual([{ label: '2024', count: 1 }])
})
