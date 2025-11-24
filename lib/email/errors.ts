/**
 * Custom error classes for email authentication system
 * Provides structured error handling with user-friendly messages and retry logic
 */

/**
 * Base error class for email-related errors
 * Includes error codes and retryable flag for transient errors
 */
export class EmailError extends Error {
  public readonly code: string
  public readonly retryable: boolean

  constructor(message: string, code: string, retryable: boolean = false) {
    super(message)
    this.name = 'EmailError'
    this.code = code
    this.retryable = retryable
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailError)
    }
  }
}

/**
 * Rate limit error for when email sending limits are exceeded
 * Includes retry-after timestamp for client guidance
 */
export class RateLimitError extends Error {
  public readonly retryAfter: Date
  public readonly code: string = 'RATE_LIMIT_EXCEEDED'

  constructor(message: string, retryAfter: Date) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError)
    }
  }

  /**
   * Get human-readable time until retry is allowed
   */
  getRetryAfterMinutes(): number {
    const now = new Date()
    const diffMs = this.retryAfter.getTime() - now.getTime()
    return Math.ceil(diffMs / (1000 * 60))
  }
}

/**
 * Token validation error for expired, invalid, or already-used tokens
 * Includes specific error codes for different token failure scenarios
 */
export class TokenError extends Error {
  public readonly code: 'EXPIRED' | 'INVALID' | 'ALREADY_USED'

  constructor(message: string, code: 'EXPIRED' | 'INVALID' | 'ALREADY_USED') {
    super(message)
    this.name = 'TokenError'
    this.code = code
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TokenError)
    }
  }

  /**
   * Check if error is due to token expiration
   */
  isExpired(): boolean {
    return this.code === 'EXPIRED'
  }

  /**
   * Check if error is due to invalid token format
   */
  isInvalid(): boolean {
    return this.code === 'INVALID'
  }

  /**
   * Check if error is due to token already being used
   */
  isAlreadyUsed(): boolean {
    return this.code === 'ALREADY_USED'
  }
}

/**
 * Type guard to check if error is an EmailError
 */
export function isEmailError(error: unknown): error is EmailError {
  return error instanceof EmailError
}

/**
 * Type guard to check if error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError
}

/**
 * Type guard to check if error is a TokenError
 */
export function isTokenError(error: unknown): error is TokenError {
  return error instanceof TokenError
}

/**
 * Error code constants for email errors
 */
export const EMAIL_ERROR_CODES = {
  // Email delivery errors
  SEND_FAILED: 'EMAIL_SEND_FAILED',
  INVALID_EMAIL: 'EMAIL_INVALID',
  PROVIDER_ERROR: 'EMAIL_PROVIDER_ERROR',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Token errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED',
  
  // Configuration errors
  MISSING_CONFIG: 'EMAIL_MISSING_CONFIG',
  INVALID_CONFIG: 'EMAIL_INVALID_CONFIG',
} as const

export type EmailErrorCode = typeof EMAIL_ERROR_CODES[keyof typeof EMAIL_ERROR_CODES]
