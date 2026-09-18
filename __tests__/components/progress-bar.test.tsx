import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import ProgressBar from '@/components/progress-bar'
import messages from '@/messages/nl.json'

function renderProgressBar(props: React.ComponentProps<typeof ProgressBar>) {
  return render(
    <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
      <ProgressBar {...props} />
    </NextIntlClientProvider>
  )
}

describe('ProgressBar', () => {
  it('toont gezien/totaal', () => {
    renderProgressBar({ value: 12, seen: 76, total: 616, animate: false })
    expect(screen.getByText('76 van 616 gezien')).toBeInTheDocument()
  })
  it('toont percentage afgerond', () => {
    renderProgressBar({ value: 12.3, seen: 76, total: 616, animate: false })
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})
