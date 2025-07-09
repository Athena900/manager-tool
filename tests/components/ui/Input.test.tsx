// ============================================
// Inputコンポーネントのテスト
// ============================================

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input Component', () => {
  it('renders input with default type text', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('renders input with specified type', () => {
    render(<Input type="email" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('renders label when provided', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('associates label with input', () => {
    render(<Input label="Email Address" />)
    const input = screen.getByRole('textbox')
    const label = screen.getByText('Email Address')
    expect(label).toHaveAttribute('for', input.id)
  })

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error styling when error is provided', () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300')
  })

  it('renders help text when provided and no error', () => {
    render(<Input helpText="Enter your email address" />)
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('does not render help text when error is provided', () => {
    render(<Input helpText="Help text" error="Error message" />)
    expect(screen.queryByText('Help text')).not.toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('renders left icon when provided', () => {
    const TestIcon = () => <span data-testid="left-icon">Icon</span>
    render(<Input leftIcon={<TestIcon />} />)
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('renders right icon when provided', () => {
    const TestIcon = () => <span data-testid="right-icon">Icon</span>
    render(<Input rightIcon={<TestIcon />} />)
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('applies padding for left icon', () => {
    const TestIcon = () => <span>Icon</span>
    render(<Input leftIcon={<TestIcon />} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('pl-10')
  })

  it('applies padding for right icon', () => {
    const TestIcon = () => <span>Icon</span>
    render(<Input rightIcon={<TestIcon />} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('pr-10')
  })

  it('applies full width when specified', () => {
    render(<Input fullWidth />)
    const container = screen.getByRole('textbox').closest('div')
    expect(container).toHaveClass('w-full')
  })

  it('handles onChange events', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('handles focus events', () => {
    const handleFocus = jest.fn()
    render(<Input onFocus={handleFocus} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    
    expect(handleFocus).toHaveBeenCalledTimes(1)
  })

  it('handles blur events', () => {
    const handleBlur = jest.fn()
    render(<Input onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('disables input when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('sets placeholder when provided', () => {
    render(<Input placeholder="Enter text here" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', 'Enter text here')
  })

  it('sets value when provided', () => {
    render(<Input value="test value" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('test value')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('sets aria-invalid when error is provided', () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('sets aria-describedby for error message', () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole('textbox')
    const errorId = `${input.id}-error`
    expect(input).toHaveAttribute('aria-describedby', errorId)
  })

  it('sets aria-describedby for help text', () => {
    render(<Input helpText="Help text" />)
    const input = screen.getByRole('textbox')
    const helpId = `${input.id}-help`
    expect(input).toHaveAttribute('aria-describedby', helpId)
  })
})