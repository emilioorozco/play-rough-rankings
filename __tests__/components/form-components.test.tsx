/**
 * Component tests for form components
 * Tests FormInput blur handling, FormField error display, FormStatus, and ARIA attributes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormInput, FormField, FormStatus } from '@/components/ui/form-components'

describe('Form Components', () => {
  describe('FormInput - Blur Event Handling', () => {
    it('should call onBlur handler when field loses focus', async () => {
      const user = userEvent.setup()
      const handleBlur = vi.fn()

      render(
        <FormInput
          label="Email"
          value=""
          onChange={() => {}}
          onBlur={handleBlur}
        />
      )

      const input = screen.getByLabelText('Email')
      
      // Focus and blur the input
      await user.click(input)
      await user.tab()

      expect(handleBlur).toHaveBeenCalled()
    })

    it('should handle blur without onBlur handler', async () => {
      const user = userEvent.setup()

      render(
        <FormInput
          label="Email"
          value=""
          onChange={() => {}}
        />
      )

      const input = screen.getByLabelText('Email')
      
      // Should not throw error when blurring without handler
      await user.click(input)
      await user.tab()

      expect(input).not.toHaveFocus()
    })

    it('should display error with correct styling', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email format"
          value=""
          onChange={() => {}}
        />
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Invalid email format')
      expect(error).toHaveClass('text-destructive')
    })

    it('should distinguish between client and server errors', () => {
      const { rerender } = render(
        <FormInput
          label="Email"
          error="Invalid email format"
          errorType="client"
          value=""
          onChange={() => {}}
        />
      )

      let error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Invalid email format')
      expect(error).not.toHaveTextContent('Server error:')

      // Rerender with server error
      rerender(
        <FormInput
          label="Email"
          error="Email already exists"
          errorType="server"
          value=""
          onChange={() => {}}
        />
      )

      error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Server error:')
      expect(error).toHaveTextContent('Email already exists')
    })
  })

  describe('FormField - Error Type Display', () => {
    it('should display client validation errors', () => {
      render(
        <FormField
          label="Password"
          error="Password must be at least 8 characters"
          errorType="client"
        >
          <input />
        </FormField>
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Password must be at least 8 characters')
      expect(error).not.toHaveTextContent('Server error:')
    })

    it('should display server errors with indicator', () => {
      render(
        <FormField
          label="Email"
          error="Email already exists"
          errorType="server"
        >
          <input />
        </FormField>
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Server error:')
      expect(error).toHaveTextContent('Email already exists')
      expect(error).toHaveClass('font-medium')
    })

    it('should show required indicator', () => {
      render(
        <FormField
          label="Email"
          required
        >
          <input />
        </FormField>
      )

      const requiredIndicator = screen.getByText('*')
      expect(requiredIndicator).toBeInTheDocument()
      expect(requiredIndicator).toHaveAttribute('aria-label', 'required')
    })

    it('should display description text', () => {
      render(
        <FormField
          label="Password"
          description="Must be at least 8 characters"
        >
          <input />
        </FormField>
      )

      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument()
    })

    it('should link error with input via aria-describedby', () => {
      render(
        <FormField
          label="Email"
          error="Invalid email"
        >
          <input />
        </FormField>
      )

      const input = screen.getByRole('textbox')
      const describedBy = input.getAttribute('aria-describedby')
      
      expect(describedBy).toBeTruthy()
      
      const errorElement = document.getElementById(describedBy!)
      expect(errorElement).toHaveTextContent('Invalid email')
    })
  })

  describe('FormStatus - Server Error Display', () => {
    it('should display success message', () => {
      render(<FormStatus success="Login successful!" />)

      // FormStatus uses role="status" for both success and error
      expect(screen.getByText('Login successful!')).toBeInTheDocument()
    })

    it('should display error message', () => {
      render(<FormStatus error="Authentication failed" />)

      // FormStatus uses role="status" not "alert"
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('should display server error with appropriate styling', () => {
      render(<FormStatus error="Server error occurred" errorType="server" />)

      expect(screen.getByText(/Server error occurred/)).toBeInTheDocument()
      expect(screen.getByText(/Server error:/)).toBeInTheDocument()
    })

    it('should not render when no message provided', () => {
      const { container } = render(<FormStatus />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('ARIA Attributes', () => {
    it('should add aria-invalid when error is present', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )

      const input = screen.getByLabelText('Email')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should add aria-required for required fields', () => {
      render(
        <FormInput
          label="Email"
          required
          value=""
          onChange={() => {}}
        />
      )

      // The label includes a required indicator (*), so we need to match it differently
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should link error message with aria-describedby', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email format"
          value=""
          onChange={() => {}}
        />
      )

      const input = screen.getByLabelText('Email')
      const describedBy = input.getAttribute('aria-describedby')
      
      expect(describedBy).toBeTruthy()
      
      const errorElement = document.getElementById(describedBy!)
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent('Invalid email format')
    })

    it('should have role="alert" on error messages', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Invalid email')
    })

    it('should have aria-live="polite" on error messages', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('should link description with aria-describedby when no error', () => {
      render(
        <FormInput
          label="Password"
          description="Must be at least 8 characters"
          value=""
          onChange={() => {}}
        />
      )

      const input = screen.getByLabelText('Password')
      const describedBy = input.getAttribute('aria-describedby')
      
      expect(describedBy).toBeTruthy()
      
      const description = document.getElementById(describedBy!)
      expect(description).toHaveTextContent('Must be at least 8 characters')
    })

    it('should prioritize error over description in aria-describedby', () => {
      render(
        <FormInput
          label="Password"
          description="Must be at least 8 characters"
          error="Password is too short"
          value=""
          onChange={() => {}}
        />
      )

      const input = screen.getByLabelText('Password')
      const describedBy = input.getAttribute('aria-describedby')
      
      expect(describedBy).toBeTruthy()
      
      // Should point to error, not description
      const errorElement = document.getElementById(describedBy!)
      expect(errorElement).toHaveTextContent('Password is too short')
    })
  })

  describe('Error Display Behavior', () => {
    it('should show error icon with error message', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )

      const alert = screen.getByRole('alert')
      // Check for AlertCircle icon (it has aria-hidden="true")
      const icon = alert.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })

    it('should apply destructive color to error text', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('text-destructive')
    })

    it('should apply additional styling for server errors', () => {
      render(
        <FormField
          label="Email"
          error="Server error"
          errorType="server"
        >
          <input />
        </FormField>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('font-medium')
    })
  })

  describe('Input Interaction', () => {
    it('should allow typing in input', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(
        <FormInput
          label="Email"
          value=""
          onChange={handleChange}
        />
      )

      const input = screen.getByLabelText('Email')
      await user.type(input, 'test@example.com')

      expect(handleChange).toHaveBeenCalled()
    })

    it('should handle focus and blur events', async () => {
      const user = userEvent.setup()
      const handleFocus = vi.fn()
      const handleBlur = vi.fn()

      render(
        <FormInput
          label="Email"
          value=""
          onChange={() => {}}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )

      const input = screen.getByLabelText('Email')
      
      await user.click(input)
      expect(handleFocus).toHaveBeenCalled()
      
      await user.tab()
      expect(handleBlur).toHaveBeenCalled()
    })
  })
})
