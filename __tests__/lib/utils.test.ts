import { slugify } from '@/lib/utils'

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Wassily Kandinsky')).toBe('wassily-kandinsky')
  })
  it('handles accented characters', () => {
    expect(slugify('Dalí')).toBe('dali')
  })
  it('strips leading/trailing dashes', () => {
    expect(slugify('  Monet  ')).toBe('monet')
  })
})
