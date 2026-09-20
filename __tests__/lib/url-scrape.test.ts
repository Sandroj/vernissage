import { extractMeta, extractDimensions, extractMedium } from '@/lib/url-scrape'

describe('extractMeta', () => {
  it('reads content after the property attribute', () => {
    expect(extractMeta('<meta property="og:image" content="https://x.test/a.jpg">', 'og:image')).toBe('https://x.test/a.jpg')
  })
  it('reads content before the property attribute', () => {
    expect(extractMeta('<meta content="Sunflowers" property="og:title">', 'og:title')).toBe('Sunflowers')
  })
  it('returns undefined when the tag is missing', () => {
    expect(extractMeta('<html></html>', 'og:image')).toBeUndefined()
  })
  it('decodes HTML entities in query strings, as real og:image tags emit', () => {
    expect(extractMeta('<meta property="og:image" content="https://x.test/a.jpg?utm_source=x&amp;utm_campaign=y">', 'og:image'))
      .toBe('https://x.test/a.jpg?utm_source=x&utm_campaign=y')
  })
})

describe('extractDimensions', () => {
  it('matches a "123 x 45 cm" pattern', () => {
    expect(extractDimensions('Olieverf op doek, 92,1 x 73 cm, gesigneerd')).toBe('92,1 x 73 cm')
  })
  it('matches the × sign', () => {
    expect(extractDimensions('Formaat: 30×40cm')).toBe('30 x 40 cm')
  })
  it('returns undefined without a dimensions pattern', () => {
    expect(extractDimensions('Geen afmetingen hier')).toBeUndefined()
  })
})

describe('extractMedium', () => {
  it('finds a known medium keyword case-insensitively', () => {
    expect(extractMedium('Techniek: OLIEVERF OP DOEK')).toBe('olieverf op doek')
  })
  it('returns undefined without a known keyword', () => {
    expect(extractMedium('Onbekende techniek')).toBeUndefined()
  })
})
