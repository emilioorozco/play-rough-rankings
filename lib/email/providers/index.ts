/**
 * Email Provider Factory
 * 
 * Provides automatic provider selection based on environment configuration.
 * 
 * Priority:
 * 1. Resend (if RESEND_API_KEY is set)
 * 2. AWS SES (if AWS credentials are set)
 * 3. Throws error if no provider is configured
 */

import { EmailProvider } from './types';
import { resendProvider } from './resend-provider';
import { sesProvider } from './ses-provider';
import { isResendConfigured } from './resend-client';

/**
 * Get the configured email provider
 * 
 * Priority:
 * 1. Resend (if RESEND_API_KEY is set)
 * 2. AWS SES (if AWS credentials are set)
 * 3. Console logging (development fallback)
 * 
 * @returns The configured email provider
 * @throws Error if no provider is configured
 */
export function getEmailProvider(): EmailProvider {
  // Check for Resend configuration first
  if (isResendConfigured()) {
    return resendProvider;
  }
  
  // Fall back to AWS SES if configured
  const hasAwsCredentials = !!(
    process.env.AWS_EMAIL_ACCESS_KEY_ID &&
    process.env.AWS_EMAIL_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
  
  if (hasAwsCredentials) {
    return sesProvider;
  }
  
  // No provider configured - will use console logging in lib/email.ts
  throw new Error('No email provider configured. Set RESEND_API_KEY or AWS credentials.');
}

/**
 * Check if any email provider is configured
 * 
 * @returns True if Resend or AWS SES is configured
 */
export function isEmailProviderConfigured(): boolean {
  return isResendConfigured() || !!(
    process.env.AWS_EMAIL_ACCESS_KEY_ID &&
    process.env.AWS_EMAIL_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
}

// Re-export types for convenience
export * from './types';

