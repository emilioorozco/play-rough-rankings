/**
 * Error Transformation Utility
 * 
 * Transforms technical server errors into user-friendly messages
 * while preserving technical details for debugging.
 */

/**
 * Transformed error structure with user-friendly message
 */
export interface TransformedError {
  /** User-friendly error message */
  message: string
  /** Field name if error is field-specific */
  field?: string
  /** Original error code */
  code?: string
  /** Whether this error is specific to a field */
  isFieldSpecific: boolean
}

/**
 * Error transformer interface defining transformation methods
 */
export interface ErrorTransformer {
  /** Transform any error into a user-friendly format */
  transform: (error: any) => TransformedError
  /** Extract field-specific errors from server response */
  extractFieldErrors: (error: any) => Record<string, string>
  /** Check if error is field-specific */
  isFieldError: (error: any) => boolean
  /** Log technical error details for debugging */
  logError: (error: any, context: string) => void
}

/**
 * Error code to user-friendly message mapping
 * Maps common server error codes to clear, actionable messages
 */
export const ERROR_CODE_MAP: Record<string, string> = {
  // Authentication errors
  'UNAUTHORIZED': 'Invalid email or password',
  'INVALID_CREDENTIALS': 'Invalid email or password',
  'USER_NOT_FOUND': 'No account found with this email address',
  'AUTHENTICATION_FAILED': 'Invalid email or password',
  'SESSION_EXPIRED': 'Your session has expired. Please sign in again',
  'INVALID_TOKEN': 'Invalid authentication token. Please sign in again',
  
  // Conflict errors
  'CONFLICT': 'This value is already in use',
  'EMAIL_EXISTS': 'This email address is already registered',
  'USERNAME_EXISTS': 'This username is already taken',
  'DUPLICATE_ENTRY': 'This entry already exists',
  'ALREADY_REGISTERED': 'You are already registered for this tournament',
  
  // Permission errors
  'FORBIDDEN': "You don't have permission to perform this action",
  'INSUFFICIENT_PERMISSIONS': "You don't have permission to perform this action",
  'ACCESS_DENIED': "You don't have permission to access this resource",
  'NOT_AUTHORIZED': "You don't have permission to perform this action",
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check your input and try again',
  'INVALID_INPUT': 'Please check your input and try again',
  'BAD_REQUEST': 'Please check your input and try again',
  'INVALID_FORMAT': 'Please check the format of your input',
  'REQUIRED_FIELD': 'This field is required',
  
  // Not found errors
  'NOT_FOUND': 'The requested resource was not found',
  'RESOURCE_NOT_FOUND': 'The requested resource was not found',
  'TOURNAMENT_NOT_FOUND': 'Tournament not found',
  'PLAYER_NOT_FOUND': 'Player not found',
  
  // Server errors
  'INTERNAL_SERVER_ERROR': 'Something went wrong. Please try again later',
  'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later',
  'DATABASE_ERROR': 'A database error occurred. Please try again later',
  'SERVER_ERROR': 'Something went wrong. Please try again later',
  
  // Network errors
  'NETWORK_ERROR': 'Network error. Please check your connection',
  'TIMEOUT': 'Request timed out. Please try again',
  'CONNECTION_ERROR': 'Connection error. Please check your internet connection',
  
  // Rate limiting
  'TOO_MANY_REQUESTS': 'Too many requests. Please wait a moment and try again',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again',
  
  // Tournament-specific errors
  'TOURNAMENT_FULL': 'This tournament is full',
  'REGISTRATION_CLOSED': 'Registration for this tournament is closed',
  'TOURNAMENT_STARTED': 'This tournament has already started',
  'INVALID_TOURNAMENT_STATUS': 'This action cannot be performed in the current tournament status',
  
  // Payment errors
  'PAYMENT_FAILED': 'Payment failed. Please try again',
  'INSUFFICIENT_FUNDS': 'Insufficient funds',
  'PAYMENT_REQUIRED': 'Payment is required to complete this action',
}

/**
 * Transform any error into a user-friendly format
 * Handles TRPCError, Better Auth errors, and generic Error objects
 * 
 * @param error - The error to transform
 * @returns Transformed error with user-friendly message
 */
export function transformError(error: any): TransformedError {
  // Default transformed error
  const transformed: TransformedError = {
    message: 'An unexpected error occurred. Please try again',
    isFieldSpecific: false,
  }

  // Handle null/undefined errors
  if (!error) {
    return transformed
  }

  // Extract error code from various error types
  let errorCode: string | undefined
  let errorMessage: string | undefined
  let fieldName: string | undefined

  // Handle TRPCError
  if (error.data?.code) {
    errorCode = error.data.code
    errorMessage = error.message
    
    // Check for field-specific error in TRPCError
    if (error.data?.field) {
      fieldName = error.data.field
      transformed.isFieldSpecific = true
    }
  }
  // Handle Better Auth errors
  else if (error.code) {
    errorCode = error.code
    errorMessage = error.message
    
    // Better Auth may include field information
    if (error.field) {
      fieldName = error.field
      transformed.isFieldSpecific = true
    }
  }
  // Handle generic Error objects
  else if (error instanceof Error) {
    errorMessage = error.message
    
    // Try to extract code from error name or message
    if (error.name && error.name !== 'Error') {
      errorCode = error.name
    }
  }
  // Handle string errors
  else if (typeof error === 'string') {
    errorMessage = error
  }
  // Handle error objects with message property
  else if (error.message) {
    errorMessage = error.message
    if (error.code) {
      errorCode = error.code
    }
  }

  // Set the error code if found
  if (errorCode) {
    transformed.code = errorCode
  }

  // Set the field if found
  if (fieldName) {
    transformed.field = fieldName
  }

  // Transform the error message
  if (errorCode && ERROR_CODE_MAP[errorCode]) {
    // Use mapped user-friendly message
    transformed.message = ERROR_CODE_MAP[errorCode]
  } else if (errorMessage) {
    // Check if the error message is already user-friendly
    // User-friendly messages typically don't contain technical terms
    const technicalTerms = [
      'prisma',
      'database',
      'query',
      'constraint',
      'foreign key',
      'null',
      'undefined',
      'stack trace',
      'exception',
      'P2002', // Prisma error codes
      'P2003',
      'P2025',
    ]
    
    const isTechnical = technicalTerms.some(term => 
      errorMessage!.toLowerCase().includes(term.toLowerCase())
    )
    
    if (!isTechnical && errorMessage.length < 200) {
      // Message appears user-friendly, use it
      transformed.message = errorMessage
    } else {
      // Message is technical, use generic message
      transformed.message = 'Something went wrong. Please try again later'
    }
  }

  return transformed
}

/**
 * Extract field-specific errors from server response
 * Handles various error formats and returns a map of field names to error messages
 * 
 * @param error - The error to extract field errors from
 * @returns Record of field names to error messages
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  if (!error) {
    return fieldErrors
  }

  // Handle TRPCError with field errors
  if (error.data?.fieldErrors) {
    // Format: { fieldErrors: { email: ['error1', 'error2'], password: ['error'] } }
    const errors = error.data.fieldErrors
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0] // Take first error message
      } else if (typeof messages === 'string') {
        fieldErrors[field] = messages
      }
    }
  }
  // Handle TRPCError with errors array
  else if (error.data?.errors && Array.isArray(error.data.errors)) {
    // Format: { errors: [{ field: 'email', message: 'Invalid email' }] }
    for (const err of error.data.errors) {
      if (err.field && err.message) {
        fieldErrors[err.field] = err.message
      }
    }
  }
  // Handle Better Auth field errors
  else if (error.fieldErrors) {
    const errors = error.fieldErrors
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0]
      } else if (typeof messages === 'string') {
        fieldErrors[field] = messages
      }
    }
  }
  // Handle Zod validation errors
  else if (error.issues && Array.isArray(error.issues)) {
    // Format: { issues: [{ path: ['email'], message: 'Invalid email' }] }
    for (const issue of error.issues) {
      if (issue.path && issue.path.length > 0) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
    }
  }
  // Handle single field error
  else if (error.field && error.message) {
    fieldErrors[error.field] = error.message
  }
  // Handle data.field format
  else if (error.data?.field && error.message) {
    fieldErrors[error.data.field] = error.message
  }

  return fieldErrors
}

/**
 * Check if error is field-specific
 * 
 * @param error - The error to check
 * @returns True if error is field-specific
 */
export function isFieldError(error: any): boolean {
  if (!error) {
    return false
  }

  // Check for field property in various formats
  if (error.field || error.data?.field) {
    return true
  }

  // Check for field errors collection
  if (error.data?.fieldErrors || error.fieldErrors) {
    return true
  }

  // Check for errors array with field information
  if (error.data?.errors && Array.isArray(error.data.errors)) {
    return error.data.errors.some((err: any) => err.field)
  }

  // Check for Zod validation errors
  if (error.issues && Array.isArray(error.issues)) {
    return error.issues.some((issue: any) => issue.path && issue.path.length > 0)
  }

  return false
}

/**
 * Log technical error details for debugging
 * Logs full error information to console while showing user-friendly messages to users
 * 
 * @param error - The error to log
 * @param context - Context string describing where the error occurred
 */
export function logError(error: any, context: string): void {
  // Only log in development or when debugging is enabled
  const shouldLog = process.env.NODE_ENV === 'development' || process.env.DEBUG

  if (!shouldLog) {
    return
  }

  console.error(`[Error Transformer] ${context}:`, {
    error,
    message: error?.message,
    code: error?.code || error?.data?.code,
    field: error?.field || error?.data?.field,
    stack: error?.stack,
    data: error?.data,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Default error transformer implementation
 * Provides a complete implementation of the ErrorTransformer interface
 */
export const errorTransformer: ErrorTransformer = {
  transform: transformError,
  extractFieldErrors,
  isFieldError,
  logError,
}
