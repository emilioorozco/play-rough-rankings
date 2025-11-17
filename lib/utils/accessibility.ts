/**
 * Accessibility utilities for form validation and error announcements
 */

/**
 * Announces a message to screen readers using an ARIA live region
 * @param message - The message to announce
 * @param priority - The priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  // Create a temporary live region element
  const liveRegion = document.createElement('div')
  liveRegion.setAttribute('role', 'status')
  liveRegion.setAttribute('aria-live', priority)
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only' // Screen reader only class
  liveRegion.style.position = 'absolute'
  liveRegion.style.left = '-10000px'
  liveRegion.style.width = '1px'
  liveRegion.style.height = '1px'
  liveRegion.style.overflow = 'hidden'

  // Add to document
  document.body.appendChild(liveRegion)

  // Set the message after a brief delay to ensure screen readers pick it up
  setTimeout(() => {
    liveRegion.textContent = message
  }, 100)

  // Remove the element after announcement
  setTimeout(() => {
    if (document.body.contains(liveRegion)) {
      document.body.removeChild(liveRegion)
    }
  }, 1000)
}

/**
 * Announces a validation error to screen readers
 * @param fieldName - The name of the field with the error
 * @param errorMessage - The error message
 */
export function announceValidationError(
  fieldName: string,
  errorMessage: string
): void {
  const message = `${fieldName}: ${errorMessage}`
  announceToScreenReader(message, 'polite')
}

/**
 * Announces that a validation error has been cleared
 * @param fieldName - The name of the field that was corrected
 */
export function announceErrorCleared(fieldName: string): void {
  const message = `${fieldName} error cleared`
  announceToScreenReader(message, 'polite')
}

/**
 * Announces form submission status
 * @param success - Whether the submission was successful
 * @param message - The status message
 */
export function announceFormStatus(success: boolean, message: string): void {
  const prefix = success ? 'Success:' : 'Error:'
  const fullMessage = `${prefix} ${message}`
  announceToScreenReader(fullMessage, success ? 'polite' : 'assertive')
}

/**
 * Announces the number of validation errors in a form
 * @param errorCount - The number of errors
 */
export function announceFormErrors(errorCount: number): void {
  if (errorCount === 0) {
    announceToScreenReader('Form is valid', 'polite')
  } else if (errorCount === 1) {
    announceToScreenReader('Form has 1 error. Please correct it before submitting.', 'assertive')
  } else {
    announceToScreenReader(
      `Form has ${errorCount} errors. Please correct them before submitting.`,
      'assertive'
    )
  }
}
