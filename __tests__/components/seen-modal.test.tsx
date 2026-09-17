import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import SeenModal from '@/components/seen-modal'
import messages from '@/messages/nl.json'

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
})
