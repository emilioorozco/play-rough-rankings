/**
 * User-facing error messages for email authentication system
 * All messages are clear, actionable, and user-friendly
 */

/**
 * Error messages for email verification flow
 */
export const VERIFICATION_ERROR_MESSAGES = {
  TOKEN_EXPIRED: 'Your verification link has expired. Please request a new verification email.',
  TOKEN_INVALID: 'Invalid verification link. Please check your email or request a new verification link.',
  TOKEN_ALREADY_USED: 'This verification link has already been used. Your email is already verified.',
  RATE_LIMIT: 'Too many verification emails sent. Please wait a few minutes before requesting another.',
  SEND_FAILED: 'Failed to send verification email. Please try again or contact support if the problem persists.',
  ALREADY_VERIFIED: 'Your email is already verified. You can proceed to sign in.',
  USER_NOT_FOUND: 'User account not found. Please sign up first.',
} as const

/**
 * Error messages for password reset flow
 */
export const PASSWORD_RESET_ERROR_MESSAGES = {
  TOKEN_EXPIRED: 'Your password reset link has expired. Please request a new password reset link.',
  TOKEN_INVALID: 'Invalid password reset link. Please request a new password reset link.',
  TOKEN_ALREADY_USED: 'This password reset link has already been used. Please request a new link if you need to reset your password again.',
  RATE_LIMIT: 'Too many password reset requests. Please wait a few minutes before trying again.',
  SEND_FAILED: 'Failed to send password reset email. Please try again or contact support if the problem persists.',
  PASSWORD_TOO_WEAK: 'Password must be at least 8 characters long and include a mix of letters, numbers, and special characters.',
  PASSWORD_MISMATCH: 'Passwords do not match. Please ensure both password fields are identical.',
  USER_NOT_FOUND: 'No account found with that email address.',
  SAME_PASSWORD: 'New password must be different from your current password.',
} as const

/**
 * Error messages for role invitation flow
 */
export const INVITATION_ERROR_MESSAGES = {
  TOKEN_EXPIRED: 'This invitation has expired. Please contact an administrator for a new invitation.',
  TOKEN_INVALID: 'Invalid invitation link. Please check your email or contact an administrator.',
  TOKEN_ALREADY_USED: 'This invitation has already been accepted.',
  ALREADY_HAS_ROLE: 'You already have this role.',
  USER_MISMATCH: 'This invitation is for a different email address.',
  SEND_FAILED: 'Failed to send invitation email. Please try again or contact support if the problem persists.',
  DUPLICATE_INVITATION: 'An invitation has already been sent to this user. Please wait for them to accept or decline.',
  UNAUTHORIZED: 'You do not have permission to send role invitations. Only administrators can send invitations.',
  INVALID_ROLE: 'Invalid role specified. Only organizer and admin roles can be assigned via invitation.',
  USER_NOT_FOUND: 'User not found. Please ensure the email address is correct.',
} as const

/**
 * Generic email error messages
 */
export const EMAIL_ERROR_MESSAGES = {
  SEND_FAILED: 'Failed to send email. Please try again or contact support if the problem persists.',
  INVALID_EMAIL: 'Invalid email address. Please check the email address and try again.',
  PROVIDER_ERROR: 'Email service is temporarily unavailable. Please try again in a few minutes.',
  MISSING_CONFIG: 'Email service is not properly configured. Please contact support.',
  INVALID_CONFIG: 'Email service configuration error. Please contact support.',
  NETWORK_ERROR: 'Network error occurred while sending email. Please check your connection and try again.',
  TIMEOUT: 'Email sending timed out. Please try again.',
} as const

/**
 * Success messages for email operations
 */
export const EMAIL_SUCCESS_MESSAGES = {
  VERIFICATION_SENT: 'Verification email sent! Please check your inbox and click the verification link.',
  VERIFICATION_RESENT: 'Verification email resent! Please check your inbox for the new verification link.',
  EMAIL_VERIFIED: 'Email verified successfully! You can now access your account.',
  PASSWORD_RESET_SENT: 'Password reset email sent! Please check your inbox and follow the instructions.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully! You can now sign in with your new password.',
  INVITATION_SENT: 'Invitation sent successfully! The user will receive an email with instructions.',
  INVITATION_ACCEPTED: 'Invitation accepted! Your role has been updated.',
  INVITATION_DECLINED: 'Invitation declined.',
} as const

/**
 * Combined error messages object for easy access
 */
export const ERROR_MESSAGES = {
  VERIFICATION: VERIFICATION_ERROR_MESSAGES,
  PASSWORD_RESET: PASSWORD_RESET_ERROR_MESSAGES,
  INVITATION: INVITATION_ERROR_MESSAGES,
  EMAIL: EMAIL_ERROR_MESSAGES,
} as const

/**
 * Combined success messages object for easy access
 */
export const SUCCESS_MESSAGES = EMAIL_SUCCESS_MESSAGES

/**
 * Helper function to get rate limit error message with retry time
 */
export function getRateLimitMessage(retryAfterMinutes: number, context: 'verification' | 'password_reset' | 'invitation'): string {
  const baseMessages = {
    verification: 'Too many verification emails sent.',
    password_reset: 'Too many password reset requests.',
    invitation: 'Too many invitations sent.',
  }
  
  const baseMessage = baseMessages[context]
  
  if (retryAfterMinutes < 1) {
    return `${baseMessage} Please wait a moment before trying again.`
  } else if (retryAfterMinutes === 1) {
    return `${baseMessage} Please wait 1 minute before trying again.`
  } else if (retryAfterMinutes < 60) {
    return `${baseMessage} Please wait ${retryAfterMinutes} minutes before trying again.`
  } else {
    const hours = Math.ceil(retryAfterMinutes / 60)
    return `${baseMessage} Please wait ${hours} hour${hours > 1 ? 's' : ''} before trying again.`
  }
}

/**
 * Helper function to get actionable error message with next steps
 */
export function getActionableErrorMessage(errorCode: string, context: 'verification' | 'password_reset' | 'invitation'): {
  message: string
  action?: string
  actionLabel?: string
} {
  const contextMessages = {
    verification: VERIFICATION_ERROR_MESSAGES,
    password_reset: PASSWORD_RESET_ERROR_MESSAGES,
    invitation: INVITATION_ERROR_MESSAGES,
  }
  
  const messages = contextMessages[context]
  
  // Map error codes to messages and actions
  if (errorCode === 'TOKEN_EXPIRED') {
    return {
      message: messages.TOKEN_EXPIRED,
      action: context === 'verification' ? 'resend' : 'request_new',
      actionLabel: context === 'verification' ? 'Resend Verification Email' : 'Request New Link',
    }
  }
  
  if (errorCode === 'TOKEN_INVALID') {
    return {
      message: messages.TOKEN_INVALID,
      action: context === 'verification' ? 'resend' : 'request_new',
      actionLabel: context === 'verification' ? 'Resend Verification Email' : 'Request New Link',
    }
  }
  
  if (errorCode === 'TOKEN_ALREADY_USED') {
    return {
      message: messages.TOKEN_ALREADY_USED,
      action: context === 'verification' ? 'sign_in' : undefined,
      actionLabel: context === 'verification' ? 'Go to Sign In' : undefined,
    }
  }
  
  if (errorCode === 'RATE_LIMIT') {
    return {
      message: 'RATE_LIMIT' in messages ? messages.RATE_LIMIT : 'Too many requests. Please wait a few minutes before trying again.',
    }
  }
  
  // Default message
  return {
    message: messages.SEND_FAILED || EMAIL_ERROR_MESSAGES.SEND_FAILED,
    action: 'retry',
    actionLabel: 'Try Again',
  }
}

/**
 * Type exports for TypeScript
 */
export type VerificationErrorMessage = typeof VERIFICATION_ERROR_MESSAGES[keyof typeof VERIFICATION_ERROR_MESSAGES]
export type PasswordResetErrorMessage = typeof PASSWORD_RESET_ERROR_MESSAGES[keyof typeof PASSWORD_RESET_ERROR_MESSAGES]
export type InvitationErrorMessage = typeof INVITATION_ERROR_MESSAGES[keyof typeof INVITATION_ERROR_MESSAGES]
export type EmailErrorMessage = typeof EMAIL_ERROR_MESSAGES[keyof typeof EMAIL_ERROR_MESSAGES]
export type SuccessMessage = typeof EMAIL_SUCCESS_MESSAGES[keyof typeof EMAIL_SUCCESS_MESSAGES]
