/**
 * Accessibility tests for form components
 * Tests keyboard navigation, ARIA attributes, and screen reader compatibility
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormInput, FormTextarea, FormSelect, FormCheckbox, FormField } from '@/components/ui/form-components'

describe('Form Component Accessibility', () => {
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
      
      const input = screen.getByRole('textbox')
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
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should link error message with aria-describedby', () => {
      render(
        <FormInput
          label="Email"
          error="Invalid email"
          value=""
          onChange={() => {}}
        />
      )
      
      const input = screen.getByRole('textbox')
      const describedBy = input.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      
      // Error message should exist with the same ID
      const errorElement = document.getElementById(describedBy!)
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent('Invalid email')
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
  })

  describe('Keyboard Navigation', () => {
    it('should allow Tab key to move between fields', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <FormInput
            label="First Name"
            value=""
            onChange={() => {}}
          />
          <FormInput
            label="Last Name"
            value=""
            onChange={() => {}}
          />
        </div>
      )
      
      const firstInput = screen.getByLabelText('First Name')
      const lastInput = screen.getByLabelText('Last Name')
      
      // Focus first input
      firstInput.focus()
      expect(firstInput).toHaveFocus()
      
      // Tab to next input
      await user.tab()
      expect(lastInput).toHaveFocus()
    })

    it('should allow Shift+Tab to move backwards', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <FormInput
            label="First Name"
            value=""
            onChange={() => {}}
          />
          <FormInput
            label="Last Name"
            value=""
            onChange={() => {}}
          />
        </div>
      )
      
      const firstInput = screen.getByLabelText('First Name')
      const lastInput = screen.getByLabelText('Last Name')
      
      // Focus last input
      lastInput.focus()
      expect(lastInput).toHaveFocus()
      
      // Shift+Tab to previous input
      await user.tab({ shift: true })
      expect(firstInput).toHaveFocus()
    })
  })

  describe('Label Association', () => {
    it('should associate label with input using htmlFor', () => {
      render(
        <FormInput
          label="Email Address"
          value=""
          onChange={() => {}}
        />
      )
      
      const input = screen.getByLabelText('Email Address')
      expect(input).toBeInTheDocument()
    })

    it('should show required indicator in label', () => {
      render(
        <FormInput
          label="Email"
          required
          value=""
          onChange={() => {}}
        />
      )
      
      // Required indicator should be present
      const label = screen.getByText('Email')
      expect(label.parentElement).toHaveTextContent('*')
    })
  })

  describe('Checkbox Accessibility', () => {
    it('should have proper ARIA attributes for checkbox', () => {
      render(
        <FormCheckbox
          label="I agree to terms"
          required
          checked={false}
          onCheckedChange={() => {}}
        />
      )
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-required', 'true')
    })

    it('should show error with proper ARIA for checkbox', () => {
      render(
        <FormCheckbox
          label="I agree to terms"
          error="You must agree to continue"
          checked={false}
          onCheckedChange={() => {}}
        />
      )
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-invalid', 'true')
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('You must agree to continue')
    })
  })

  describe('Description Text', () => {
    it('should link description with aria-describedby when no error', () => {
      render(
        <FormInput
          label="Password"
          description="Must be at least 8 characters"
          value=""
          onChange={() => {}}
        />
      )
      
      const input = screen.getByRole('textbox')
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
      
      const input = screen.getByRole('textbox')
      const describedBy = input.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      
      // Should point to error, not description
      const errorElement = document.getElementById(describedBy!)
      expect(errorElement).toHaveTextContent('Password is too short')
    })
  })
})
