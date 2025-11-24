/**
 * Email Template Factory Functions
 * 
 * Factory functions for creating email templates for verification,
 * password reset, and role invitation flows.
 */

import { EmailTemplateBuilder } from './builder'
import type {
  EmailTemplateData,
  VerificationEmailData,
  PasswordResetEmailData,
  RoleInvitationEmailData,
} from './types'

/**
 * Initialize email template builder with Play Rough Rankings brand configuration
 */
export const emailTemplateBuilder = new EmailTemplateBuilder({
  appName: 'Play Rough Rankings',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  colors: {
    primary: '#E83F6F',    // Pink - Primary brand color
    danger: '#dc3545',     // Red - For destructive/warning actions
    success: '#28a745',    // Green - For positive actions
    text: '#333333',       // Main text color
    textLight: '#666666',  // Secondary text color
    textMuted: '#999999',  // Muted text for hints
    background: '#FCF7F1', // Light background color
  },
})

/**
 * Create email verification template
 * 
 * Generates a branded email template for email address verification
 * during user registration.
 * 
 * @param data - Verification email data
 * @returns Email template data ready for rendering
 */
export function createVerificationEmailTemplate(
  data: VerificationEmailData
): EmailTemplateData {
  return {
    subject: 'Verify your email address',
    preheader: 'Complete your registration by verifying your email',
    heading: 'Verify Your Email Address',
    body: [
      `Hello ${data.userName},`,
      'Thank you for signing up! Please verify your email address to complete your registration and start tracking your tournament rankings.',
    ],
    ctaText: 'Verify Email',
    ctaUrl: data.verificationUrl,
    ctaColor: 'primary',
    securityNote:
      "This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.",
  }
}

/**
 * Create password reset template
 * 
 * Generates a branded email template for password reset requests.
 * 
 * @param data - Password reset email data
 * @returns Email template data ready for rendering
 */
export function createPasswordResetEmailTemplate(
  data: PasswordResetEmailData
): EmailTemplateData {
  return {
    subject: 'Reset your password',
    preheader: 'You requested to reset your password',
    heading: 'Reset Your Password',
    body: [
      `Hello ${data.userName},`,
      'You requested to reset your password. Click the button below to create a new password.',
    ],
    ctaText: 'Reset Password',
    ctaUrl: data.resetUrl,
    ctaColor: 'danger',
    securityNote:
      "This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
  }
}

/**
 * Create role invitation template
 * 
 * Generates a branded email template for role upgrade invitations
 * (organizer or admin roles).
 * 
 * @param data - Role invitation email data
 * @returns Email template data ready for rendering
 */
export function createRoleInvitationEmailTemplate(
  data: RoleInvitationEmailData
): EmailTemplateData {
  const roleName =
    data.role === 'admin' ? 'Administrator' : 'Tournament Organizer'
  
  const roleDescription =
    data.role === 'admin'
      ? 'manage users, games, and all tournaments'
      : 'create and manage tournaments'

  return {
    subject: `You've been invited to become a ${roleName}`,
    preheader: `${data.inviterName} has invited you to join as a ${roleName}`,
    heading: "You've Been Invited!",
    body: [
      'Hello,',
      `${data.inviterName} has invited you to become a ${roleName} on Play Rough Rankings.`,
      `As a ${roleName}, you'll be able to ${roleDescription}.`,
    ],
    ctaText: 'Accept Invitation',
    ctaUrl: data.invitationUrl,
    ctaColor: 'success',
    securityNote:
      "This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.",
  }
}

// Re-export types for convenience
export type {
  EmailTemplateData,
  EmailBrandConfig,
  EmailTemplateResult,
  VerificationEmailData,
  PasswordResetEmailData,
  RoleInvitationEmailData,
} from './types'

export { EmailTemplateBuilder } from './builder'
