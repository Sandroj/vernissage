import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import Nav from '@/components/nav'
import messages from '@/messages/nl.json'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => ({ children, href }: any) => <a href={href}>{children}</a>)

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

function renderNav() {
  return render(
    <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
      <Nav />
    </NextIntlClientProvider>
  )
}

describe('Nav', () => {
  it('toont Pinacot logo', () => {
    renderNav()
    expect(screen.getByText('Pinacot')).toBeInTheDocument()
  })
  it('toont Inloggen als niet ingelogd', () => {
    renderNav()
    expect(screen.getByText('Inloggen')).toBeInTheDocument()
  })
})
