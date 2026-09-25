import { artistSortName } from '@/lib/artist-sort-name'

describe('artistSortName', () => {
  it('defaults to the last word of the name', () => {
    expect(artistSortName('Vincent van Gogh')).toBe('Gogh')
    expect(artistSortName('Claude Monet')).toBe('Monet')
  })

  it('overrides names better known by their first name', () => {
    expect(artistSortName('Rembrandt van Rijn')).toBe('Rembrandt')
  })
})
