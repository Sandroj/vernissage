import { render, screen } from '@testing-library/react'
import Nav from '@/components/nav'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}))

jest.mock('next/link', () => ({ children, href }: any) => <a href={href}>{children}</a>)

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

describe('Nav', () => {
  it('toont ArtTracker logo', () => {
    render(<Nav />)
    expect(screen.getByText('ArtTracker')).toBeInTheDocument()
  })
  it('toont Inloggen als niet ingelogd', () => {
    render(<Nav />)
    expect(screen.getByText('Inloggen')).toBeInTheDocument()
  })
})
