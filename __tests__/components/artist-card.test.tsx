import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import ArtistCard from '@/components/artist-card'
import messages from '@/messages/nl.json'

jest.mock('next/link', () => {
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
  }
})

function renderArtistCard(overrides: Partial<React.ComponentProps<typeof ArtistCard>> = {}) {
  const defaultProps: React.ComponentProps<typeof ArtistCard> = {
    artist: {
      id: 1,
      name: 'Claude Monet',
      slug: 'claude-monet',
      portrait_url: null,
      _count: { artworks: 12 },
      artworks: [],
    },
    seenCount: 3,
    featuredImage: null,
  }
  return render(
    <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
      <ArtistCard {...defaultProps} {...overrides} />
    </NextIntlClientProvider>
  )
}

describe('ArtistCard', () => {
  it('toont de naam van de kunstenaar', () => {
    renderArtistCard()
    expect(screen.getByText('Claude Monet')).toBeInTheDocument()
  })

  it('linkt naar de kunstenaar-detailpagina', () => {
    renderArtistCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/artists/claude-monet')
  })

  it('toont een letter-fallback zonder afbeelding', () => {
    renderArtistCard()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('toont geen geboortejaar meer (compacte tegel)', () => {
    renderArtistCard()
    expect(screen.queryByText(/geb\./)).not.toBeInTheDocument()
  })
})
