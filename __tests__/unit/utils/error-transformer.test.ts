/**
 * Unit tests for error transformation utility
 * Tests error code mapping, field error extraction, and user-friendly message transformation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  transformError,
  extractFieldErrors,
  isFieldError,
  logError,
  ERROR_CODE_MAP,
  type TransformedError
} from '@/lib/utils/error-transformer'

describe('Error Transformation Utility', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('transformError', () => {
    it('should transform UNAUTHORIZED error code', () => {
      const error = { code: 'UNAUTHORIZED', message: 'Unauthorized' }
      const result = transformError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.isFieldSpecific).toBe(false)
    })

    it('should transform CONFLICT error code', () => {
      const error = { code: 'CONFLICT', message: 'Conflict' }
      const result = transformError(error)

      expect(result.message).toBe('This value is already in use')
      expect(result.code).toBe('CONFLICT')
    })

    it('should transform EMAIL_EXISTS error code', () => {
      const error = { code: 'EMAIL_EXISTS', message: 'Email exists' }
      const result = transformError(error)

      expect(result.message).toBe('This email address is already registered')
      expect(result.code).toBe('EMAIL_EXISTS')
    })

    it('should transform FORBIDDEN error code', () => {
      const error = { code: 'FORBIDDEN', message: 'Forbidden' }
      const result = transformError(error)

      expect(result.message).toBe("You don't have permission to perform this action")
      expect(result.code).toBe('FORBIDDEN')
    })

    it('should transform USER_NOT_FOUND error code', () => {
      const error = { code: 'USER_NOT_FOUND', message: 'User not found' }
      const result = transformError(error)

      expect(result.message).toBe('No account found with this email address')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should transform VALIDATION_ERROR error code', () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Validation failed' }
      const result = transformError(error)

      expect(result.message).toBe('Please check your input and try again')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should transform INTERNAL_SERVER_ERROR error code', () => {
      const error = { code: 'INTERNAL_SERVER_ERROR', message: 'Internal error' }
      const result = transformError(error)

      expect(result.message).toBe('Something went wrong. Please try again later')
      expect(result.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should preserve user-friendly messages', () => {
      const error = { message: 'Your session has expired. Please log in again.' }
      const result = transformError(error)

      expect(result.message).toBe('Your session has expired. Please log in again.')
    })

    it('should handle errors without code', () => {
      const error = { message: 'Something went wrong' }
      const result = transformError(error)

      expect(result.message).toBe('Something went wrong')
      expect(result.code).toBeUndefined()
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error message')
      const result = transformError(error)

      expect(result.message).toBe('Test error message')
    })

    it('should handle string errors', () => {
      const error = 'Simple error string'
      const result = transformError(error)

      expect(result.message).toBe('Simple error string')
    })

    it('should handle TRPCError format', () => {
      const error = {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
        data: { code: 'UNAUTHORIZED' }
      }
      const result = transformError(error)

      expect(result.message).toBe('Invalid email or password')
      expect(result.code).toBe('UNAUTHORIZED')
    })

    it('should handle Better Auth error format', () => {
      const error = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials provided'
      }
      const result = transformError(error)

      expect(result.message).toBe('Invalid email or password')
    })
  })

  describe('extractFieldErrors', () => {
    it('should extract field-specific errors from object', () => {
      const error = {
        fieldErrors: {
          email: 'Invalid email format',
          password: 'Password too short'
        }
      }
      const result = extractFieldErrors(error)

      expect(result).toEqual({
        email: 'Invalid email format',
        password: 'Password too short'
      })
    })

    it('should extract errors from issues array (Zod format)', () => {
      const error = {
        issues: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['password'], message: 'Required' }
        ]
      }
      const result = extractFieldErrors(error)

      expect(result).toEqual({
        email: 'Invalid email',
        password: 'Required'
      })
    })

    it('should extract errors from data.errors array', () => {
      const error = {
        data: {
          errors: [
            { field: 'email', message: 'Email already exists' },
            { field: 'username', message: 'Username taken' }
          ]
        }
      }
      const result = extractFieldErrors(error)

      expect(result).toEqual({
        email: 'Email already exists',
        username: 'Username taken'
      })
    })

    it('should handle nested path arrays by taking first element', () => {
      const error = {
        issues: [
          { path: ['user', 'email'], message: 'Invalid email' },
          { path: ['profile', 'name'], message: 'Required' }
        ]
      }
      const result = extractFieldErrors(error)

      // Implementation takes only the first element of the path
      expect(result).toEqual({
        'user': 'Invalid email',
        'profile': 'Required'
      })
    })

    it('should return empty object when no field errors', () => {
      const error = { message: 'General error' }
      const result = extractFieldErrors(error)

      expect(result).toEqual({})
    })

    it('should handle array of error messages', () => {
      const error = {
        fieldErrors: {
          email: ['Invalid format', 'Already exists']
        }
      }
      const result = extractFieldErrors(error)

      expect(result.email).toBe('Invalid format')
    })

    it('should extract field error messages as-is', () => {
      const error = {
        fieldErrors: {
          email: 'EMAIL_EXISTS'
        }
      }
      const result = extractFieldErrors(error)

      // extractFieldErrors returns messages as-is, transformation happens in transformError
      expect(result.email).toBe('EMAIL_EXISTS')
    })
  })

  describe('isFieldError', () => {
    it('should return true for errors with fieldErrors', () => {
      const error = {
        fieldErrors: {
          email: 'Invalid email'
        }
      }
      expect(isFieldError(error)).toBe(true)
    })

    it('should return true for errors with issues array', () => {
      const error = {
        issues: [
          { path: ['email'], message: 'Invalid' }
        ]
      }
      expect(isFieldError(error)).toBe(true)
    })

    it('should return true for errors with data.errors array', () => {
      const error = {
        data: {
          errors: [
            { field: 'email', message: 'Invalid' }
          ]
        }
      }
      expect(isFieldError(error)).toBe(true)
    })

    it('should return false for general errors', () => {
      const error = { message: 'General error' }
      expect(isFieldError(error)).toBe(false)
    })

    it('should return true for errors with fieldErrors property', () => {
      const error = { fieldErrors: {} }
      // Implementation checks for presence of fieldErrors property, not if it's empty
      expect(isFieldError(error)).toBe(true)
    })

    it('should return false for empty issues array', () => {
      const error = { issues: [] }
      expect(isFieldError(error)).toBe(false)
    })
  })

  describe('logError', () => {
    it('should log error with context in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      const context = 'Login form submission'

      logError(error, context)

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[Error Transformer]')
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(context)

      process.env.NODE_ENV = originalEnv
    })

    it('should not log in test mode by default', () => {
      const error = { code: 'UNAUTHORIZED', message: 'Auth failed' }
      const context = 'API call'

      logError(error, context)

      // Should not log in test mode unless DEBUG is set
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should log when DEBUG is enabled', () => {
      const originalDebug = process.env.DEBUG
      process.env.DEBUG = 'true'

      const error = 'Simple error'
      const context = 'Validation'

      logError(error, context)

      expect(consoleErrorSpy).toHaveBeenCalled()

      process.env.DEBUG = originalDebug
    })
  })

  describe('ERROR_CODE_MAP', () => {
    it('should have mapping for all common error codes', () => {
      const requiredCodes = [
        'UNAUTHORIZED',
        'INVALID_CREDENTIALS',
        'USER_NOT_FOUND',
        'CONFLICT',
        'EMAIL_EXISTS',
        'FORBIDDEN',
        'VALIDATION_ERROR',
        'INTERNAL_SERVER_ERROR',
        'NETWORK_ERROR',
        'TIMEOUT'
      ]

      requiredCodes.forEach(code => {
        expect(ERROR_CODE_MAP[code]).toBeDefined()
        expect(ERROR_CODE_MAP[code].length).toBeGreaterThan(0)
      })
    })

    it('should have user-friendly messages', () => {
      Object.values(ERROR_CODE_MAP).forEach(message => {
        // Messages should be complete sentences or phrases
        expect(message.length).toBeGreaterThan(10)
        // Messages should not contain technical stack traces or exceptions
        expect(message).not.toMatch(/\b(exception|stack trace)\b/i)
        // Note: "error" is acceptable in user-facing messages like "A database error occurred"
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null error', () => {
      const result = transformError(null)
      expect(result.message).toBe('An unexpected error occurred. Please try again')
    })

    it('should handle undefined error', () => {
      const result = transformError(undefined)
      expect(result.message).toBe('An unexpected error occurred. Please try again')
    })

    it('should handle empty object error', () => {
      const result = transformError({})
      expect(result.message).toBe('An unexpected error occurred. Please try again')
    })

    it('should handle error with only code', () => {
      const error = { code: 'UNKNOWN_CODE' }
      const result = transformError(error)
      expect(result.message).toBeDefined()
      expect(result.code).toBe('UNKNOWN_CODE')
    })

    it('should handle deeply nested error structure', () => {
      const error = {
        response: {
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Auth failed'
            }
          }
        }
      }
      const result = transformError(error)
      expect(result.message).toBeDefined()
    })
  })

  describe('Integration with Form System', () => {
    it('should extract field errors for form display', () => {
      const serverError = {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          email: 'EMAIL_EXISTS',
          password: 'Password must be at least 8 characters'
        }
      }

      const fieldErrors = extractFieldErrors(serverError)
      
      // extractFieldErrors returns raw messages, form system transforms them
      expect(fieldErrors.email).toBe('EMAIL_EXISTS')
      expect(fieldErrors.password).toBe('Password must be at least 8 characters')
    })

    it('should identify form-level vs field-level errors', () => {
      const fieldError = {
        fieldErrors: { email: 'Invalid' }
      }
      const formError = {
        message: 'Server error'
      }

      expect(isFieldError(fieldError)).toBe(true)
      expect(isFieldError(formError)).toBe(false)
    })

    it('should transform and log errors for debugging', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection failed',
        stack: 'Error stack trace...'
      }

      const transformed = transformError(error)
      logError(error, 'Form submission')

      // User sees friendly message
      expect(transformed.message).toBe('Something went wrong. Please try again later')
      
      // Developer sees technical details in console (in development mode)
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Form submission')

      process.env.NODE_ENV = originalEnv
    })
  })
})
