import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { toast } from 'sonner'
import SeenModal from '@/components/seen-modal'
import messages from '@/messages/nl.json'

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))
jest.mock('@/components/museum-search', () => () => <div>MuseumSearch</div>)
jest.mock('@/components/star-rating', () => () => <div>StarRating</div>)
jest.mock('@/components/ui/calendar', () => ({ Calendar: () => <div>Calendar</div> }))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))
jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))
jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('SeenModal', () => {
  it('toont titel van het kunstwerk', () => {
    render(
      <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
        <SeenModal
          artworkId={1}
          artworkTitle="Colorful Life"
          open={true}
          onOpenChange={jest.fn()}
          onSaved={jest.fn()}
          onRemoved={jest.fn()}
        />
      </NextIntlClientProvider>
    )
    expect(screen.getByText('Colorful Life')).toBeInTheDocument()
    expect(screen.getByText('Markeer als gezien')).toBeInTheDocument()
  })

  it('shows an error toast when saving fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false })
    const user = userEvent.setup()

    render(
      <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
        <SeenModal
          artworkId={1}
          artworkTitle="Colorful Life"
          open={true}
          onOpenChange={jest.fn()}
          onSaved={jest.fn()}
          onRemoved={jest.fn()}
        />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByText('Opslaan'))

    expect(toast.error).toHaveBeenCalledWith('Kon niet opslaan. Probeer het opnieuw.')
  })

  it('does not resubmit photo_url when the photo was not touched', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
    const user = userEvent.setup()

    render(
      <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
        <SeenModal
          artworkId={1}
          artworkTitle="Colorful Life"
          open={true}
          onOpenChange={jest.fn()}
          existingSeen={{
            id: 1,
            dateSeen: '2026-01-01T00:00:00Z',
            locationSeen: null,
            notes: null,
            rating: null,
            photo_url: 'https://signed.example/photo.jpg',
          }}
          onSaved={jest.fn()}
          onRemoved={jest.fn()}
        />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByText('Opslaan'))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('photo_url')
  })
})
