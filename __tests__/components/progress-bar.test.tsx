import { render, screen } from '@testing-library/react'
import ProgressBar from '@/components/progress-bar'

describe('ProgressBar', () => {
  it('toont gezien/totaal', () => {
    render(<ProgressBar value={12} seen={76} total={616} animate={false} />)
    expect(screen.getByText('76 van 616 gezien')).toBeInTheDocument()
  })
  it('toont percentage afgerond', () => {
    render(<ProgressBar value={12.3} seen={76} total={616} animate={false} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})
