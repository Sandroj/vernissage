import { artworkPopularityScore } from '@/lib/artwork-popularity'

describe('artworkPopularityScore', () => {
  it('ranks multiple Van Gogh Sunflowers variants as popular', () => {
    const twelve = artworkPopularityScore('vincent-van-gogh', {
      title: 'Still Life - Vase with Twelve Sunflowers',
    })
    const fourteen = artworkPopularityScore('vincent-van-gogh', {
      title: 'Still life: vase with fourteen sunflowers',
      catalogue_id: 'F454',
    })
    const singleStudy = artworkPopularityScore('vincent-van-gogh', {
      title: 'Still life: sunflower',
    })

    expect(twelve).toBeGreaterThan(0)
    expect(fourteen).toBeGreaterThan(0)
    expect(singleStudy).toBe(0)
  })

  it('recognizes Van Gogh Bedroom titles and catalogue ids', () => {
    expect(artworkPopularityScore('vincent-van-gogh', {
      title: "Vincent's Bedroom in Arles (No. 3)",
    })).toBeGreaterThan(0)

    expect(artworkPopularityScore('vincent-van-gogh', {
      title: 'A different title',
      catalogue_id: 'F482',
    })).toBeGreaterThan(0)
  })

  it('puts researched popularity ahead of seen counts when sorting', () => {
    const artworks = [
      { title: 'Unranked Study', _count: { seenBy: 12 } },
      { title: "Vincent's Bedroom in Arles", _count: { seenBy: 0 } },
      { title: 'Still Life - Vase with Twelve Sunflowers', _count: { seenBy: 0 } },
    ]

    const sorted = [...artworks].sort((a, b) =>
      artworkPopularityScore('vincent-van-gogh', b) - artworkPopularityScore('vincent-van-gogh', a) ||
      (b._count?.seenBy ?? 0) - (a._count?.seenBy ?? 0)
    )

    expect(sorted.map((artwork) => artwork.title)).toEqual([
      'Still Life - Vase with Twelve Sunflowers',
      "Vincent's Bedroom in Arles",
      'Unranked Study',
    ])
  })

  it('recognizes popular works for the other current artists', () => {
    expect(artworkPopularityScore('claude-monet', { title: 'Impression, sunrise' })).toBeGreaterThan(0)
    expect(artworkPopularityScore('johannes-vermeer', { title: 'Girl with a Pearl Earring' })).toBeGreaterThan(0)
    expect(artworkPopularityScore('gustav-klimt', { title: 'The Kiss' })).toBeGreaterThan(0)
    expect(artworkPopularityScore('wassily-kandinsky', { title: 'Composition VII' })).toBeGreaterThan(0)
    expect(artworkPopularityScore('frida-kahlo', { title: 'The Two Fridas' })).toBeGreaterThan(0)
  })
})
