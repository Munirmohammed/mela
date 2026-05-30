import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './Button'

describe('Button (shared @mela/ui-web)', () => {
  it('renders its children', () => {
    render(<Button>Order now</Button>)
    expect(screen.getByRole('button', { name: 'Order now' })).toBeInTheDocument()
  })

  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
