/**
 * Error handling utilities for email authentication system
 * Converts custom errors to tRPC errors with user-friendly messages
 */

import { TRPCError } from '@trpc/server'
import { 
  EmailError, 
  RateLimitError, 
  TokenError,
  isEmailError,
  isRateLimitError,
  isTokenError,
} from './errors'
import { 
  ERROR_MESSAGES,
  getRateLimitMessage,
  getActionableErrorMessage,
} from './error-messages'

/**
 * Convert email system errors to tRPC errors
 * Provides user-friendly messages and appropriate HTTP status codes
 */
export function handleEmailError(
  error: unknown,
  context: 'verification' | 'password_reset' | 'invitation',
  logger?: (message: string, error: unknown) => void
): never {
  // Log error for debugging
  if (logger) {
    logger(`[EMAIL ERROR] ${context}:`, error)
  } else {
    console.error(`[EMAIL ERROR] ${context}:`, error)
  }

  // Handle rate limit errors
  if (isRateLimitError(error)) {
    const retryAfterMinutes = error.getRetryAfterMinutes()
    const message = getRateLimitMessage(retryAfterMinutes, context)
    
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message,
      cause: error,
    })
  }

  // Handle token errors
  if (isTokenError(error)) {
    const actionable = getActionableErrorMessage(error.code, context)
    
    // Map token error codes to tRPC error codes
    const codeMap: Record<TokenError['code'], 'BAD_REQUEST' | 'UNAUTHORIZED'> = {
      EXPIRED: 'BAD_REQUEST',
      INVALID: 'BAD_REQUEST',
      ALREADY_USED: 'BAD_REQUEST',
    }
    
    throw new TRPCError({
      code: codeMap[error.code],
      message: actionable.message,
      cause: error,
    })
  }

  // Handle email errors
  if (isEmailError(error)) {
    // Determine if error is retryable
    const code = error.retryable ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'
    
    throw new TRPCError({
      code,
      message: error.message,
      cause: error,
    })
  }

  // Handle tRPC errors (pass through)
  if (error instanceof TRPCError) {
    throw error
  }

  // Handle generic errors
  if (error instanceof Error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: ERROR_MESSAGES.EMAIL.SEND_FAILED,
      cause: error,
    })
  }

  // Unknown error type
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  })
}

/**
 * Wrap async email operations with error handling
 * Automatically converts errors to tRPC errors
 */
export async function withEmailErrorHandling<T>(
  operation: () => Promise<T>,
  context: 'verification' | 'password_reset' | 'invitation',
  logger?: (message: string, error: unknown) => void
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    handleEmailError(error, context, logger)
  }
}

/**
 * Create a safe error response for security-sensitive operations
 * Returns generic success message regardless of actual outcome
 */
export function createSecureResponse(
  actualSuccess: boolean,
  successMessage: string,
  error?: unknown,
  logger?: (message: string, error: unknown) => void
): { success: true; message: string } {
  if (!actualSuccess && error && logger) {
    logger('[SECURE RESPONSE] Operation failed but returning success:', error)
  }
  
  return {
    success: true,
    message: successMessage,
  }
}

/**
 * Validate token and throw appropriate error if invalid
 */
export function validateToken(
  token: string | null | undefined,
  expiresAt: Date | null | undefined,
  context: 'verification' | 'password_reset' | 'invitation'
): void {
  // Map context to ERROR_MESSAGES keys
  const contextKey = context === 'verification' ? 'VERIFICATION' : 
                     context === 'password_reset' ? 'PASSWORD_RESET' : 
                     'INVITATION'
  
  if (!token) {
    throw new TokenError(
      ERROR_MESSAGES[contextKey].TOKEN_INVALID,
      'INVALID'
    )
  }

  if (!expiresAt) {
    throw new TokenError(
      ERROR_MESSAGES[contextKey].TOKEN_INVALID,
      'INVALID'
    )
  }

  if (expiresAt < new Date()) {
    throw new TokenError(
      ERROR_MESSAGES[contextKey].TOKEN_EXPIRED,
      'EXPIRED'
    )
  }
}

/**
 * Log email operation for monitoring and debugging
 */
export function logEmailOperation(
  operation: string,
  context: 'verification' | 'password_reset' | 'invitation',
  details: Record<string, unknown>
): void {
  console.log(`[EMAIL] ${operation} (${context}):`, {
    timestamp: new Date().toISOString(),
    ...details,
  })
}
