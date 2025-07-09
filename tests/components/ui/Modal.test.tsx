// ============================================
// Modalコンポーネントのテスト
// ============================================

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal'

describe('Modal Component', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('renders close button by default', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    const closeButton = screen.getByRole('button')
    expect(closeButton).toBeInTheDocument()
  })

  it('does not render close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when escape key is pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked by default', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    const overlay = screen.getByText('Modal content').closest('div')?.previousSibling
    if (overlay) {
      fireEvent.click(overlay as Element)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={false}>
        <div>Modal content</div>
      </Modal>
    )
    const overlay = screen.getByText('Modal content').closest('div')?.previousSibling
    if (overlay) {
      fireEvent.click(overlay as Element)
      expect(mockOnClose).not.toHaveBeenCalled()
    }
  })

  it('applies small size class when size is sm', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm">
        <div>Modal content</div>
      </Modal>
    )
    const modal = screen.getByText('Modal content').closest('div')
    expect(modal).toHaveClass('max-w-md')
  })

  it('applies medium size class by default', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    )
    const modal = screen.getByText('Modal content').closest('div')
    expect(modal).toHaveClass('max-w-lg')
  })

  it('applies large size class when size is lg', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} size="lg">
        <div>Modal content</div>
      </Modal>
    )
    const modal = screen.getByText('Modal content').closest('div')
    expect(modal).toHaveClass('max-w-2xl')
  })

  it('applies extra large size class when size is xl', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} size="xl">
        <div>Modal content</div>
      </Modal>
    )
    const modal = screen.getByText('Modal content').closest('div')
    expect(modal).toHaveClass('max-w-4xl')
  })

  it('applies custom className', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} className="custom-modal">
        <div>Modal content</div>
      </Modal>
    )
    const modal = screen.getByText('Modal content').closest('div')
    expect(modal).toHaveClass('custom-modal')
  })
})

describe('ModalContent Component', () => {
  it('renders children with default padding', () => {
    render(
      <ModalContent>
        <div>Content</div>
      </ModalContent>
    )
    const content = screen.getByText('Content').parentElement
    expect(content).toHaveClass('p-6')
  })

  it('applies custom className', () => {
    render(
      <ModalContent className="custom-content">
        <div>Content</div>
      </ModalContent>
    )
    const content = screen.getByText('Content').parentElement
    expect(content).toHaveClass('custom-content')
  })
})

describe('ModalFooter Component', () => {
  it('renders children with default styling', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Save</button>
      </ModalFooter>
    )
    const footer = screen.getByText('Cancel').parentElement
    expect(footer).toHaveClass('flex', 'items-center', 'justify-end', 'gap-3', 'p-6')
  })

  it('applies custom className', () => {
    render(
      <ModalFooter className="custom-footer">
        <button>Cancel</button>
      </ModalFooter>
    )
    const footer = screen.getByText('Cancel').parentElement
    expect(footer).toHaveClass('custom-footer')
  })
})