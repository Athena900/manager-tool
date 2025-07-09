// ============================================
// Buttonコンポーネントのテスト
// ============================================

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders button with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('applies primary variant by default', () => {
    render(<Button>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-blue-600')
  })

  it('applies secondary variant when specified', () => {
    render(<Button variant="secondary">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gray-100')
  })

  it('applies success variant when specified', () => {
    render(<Button variant="success">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-green-600')
  })

  it('applies warning variant when specified', () => {
    render(<Button variant="warning">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-orange-600')
  })

  it('applies danger variant when specified', () => {
    render(<Button variant="danger">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-red-600')
  })

  it('applies ghost variant when specified', () => {
    render(<Button variant="ghost">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-gray-600')
  })

  it('applies small size when specified', () => {
    render(<Button size="sm">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-3', 'py-2', 'text-sm')
  })

  it('applies medium size by default', () => {
    render(<Button>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm')
  })

  it('applies large size when specified', () => {
    render(<Button size="lg">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-6', 'py-3', 'text-base')
  })

  it('applies full width when specified', () => {
    render(<Button fullWidth>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-full')
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('disables button when disabled', () => {
    render(<Button disabled>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('disables button when loading', () => {
    render(<Button loading>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders left icon when provided', () => {
    const TestIcon = () => <span data-testid="left-icon">Icon</span>
    render(<Button leftIcon={<TestIcon />}>Button</Button>)
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('renders right icon when provided', () => {
    const TestIcon = () => <span data-testid="right-icon">Icon</span>
    render(<Button rightIcon={<TestIcon />}>Button</Button>)
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('does not render icons when loading', () => {
    const TestIcon = () => <span data-testid="icon">Icon</span>
    render(
      <Button loading leftIcon={<TestIcon />} rightIcon={<TestIcon />}>
        Button
      </Button>
    )
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Button</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not trigger click when disabled', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} disabled>Button</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards ref to button element', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Button</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes through other props to button element', () => {
    render(<Button data-testid="test-button" aria-label="Test">Button</Button>)
    const button = screen.getByTestId('test-button')
    expect(button).toHaveAttribute('aria-label', 'Test')
  })
})