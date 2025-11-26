/**
 * Email Service Utility
 * 
 * Provides email sending functionality for:
 * - Email verification
 * - Password reset
 * - Role upgrade invitations
 * 
 * Uses provider abstraction layer to support multiple email providers:
 * - Resend (primary, if RESEND_API_KEY is set)
 * - AWS SES (fallback, if AWS credentials are set)
 * - Console logging (development fallback)
 */

import {
  emailTemplateBuilder,
  createVerificationEmailTemplate,
  createPasswordResetEmailTemplate,
  createRoleInvitationEmailTemplate,
} from './email/templates';
import { checkRateLimit, RateLimitError } from './email/rate-limiter';
import { isRecipientSuppressed, getSuppressionDetails } from './messaging/suppression-manager';
import { logMessageDelivery } from './messaging/delivery-logger';
import { getEmailProvider, isEmailProviderConfigured, EmailProvider, EmailProviderResponse, EmailRateLimitError } from './email/providers';

// Re-export RateLimitError for convenience
export { RateLimitError } from './email/rate-limiter';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface VerificationEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  url: string;
  token: string;
}

export interface PasswordResetEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  url: string;
  token: string;
}

export interface InvitationEmailData {
  email: string;
  role: 'organizer' | 'admin';
  invitedBy: {
    name?: string | null;
    email: string;
  };
  url: string;
  token: string;
}

/**
 * Email delivery log entry for tracking email send attempts
 */
export interface EmailDeliveryLog {
  /** Email type */
  type: 'verification' | 'password_reset' | 'role_invitation';
  /** Recipient email address */
  to: string;
  /** Email subject */
  subject: string;
  /** Delivery status */
  status: 'sent' | 'failed';
  /** AWS SES message ID (if sent successfully) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Timestamp of send attempt */
  timestamp: Date;
}

/**
 * Log email delivery attempt
 * 
 * Logs email send attempts with status, recipient, and error details.
 * In development mode, also logs full email content.
 * 
 * @param log - Email delivery log entry
 */
function logEmailDelivery(log: EmailDeliveryLog): void {
  const timestamp = log.timestamp.toISOString();
  const prefix = '[EMAIL SERVICE]';
  
  if (log.status === 'sent') {
    console.log(
      `${prefix} [${timestamp}] Email sent successfully`,
      `\n  Type: ${log.type}`,
      `\n  To: ${log.to}`,
      `\n  Subject: ${log.subject}`,
      log.messageId ? `\n  Message ID: ${log.messageId}` : ''
    );
  } else {
    console.error(
      `${prefix} [${timestamp}] Email send failed`,
      `\n  Type: ${log.type}`,
      `\n  To: ${log.to}`,
      `\n  Subject: ${log.subject}`,
      `\n  Error: ${log.error}`
    );
  }
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (provider-agnostic)
 * 
 * Determines if an email provider error is transient and should be retried.
 * 
 * @param error - Error object
 * @returns True if the error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on rate limit errors
  if (error instanceof EmailRateLimitError) {
    return true;
  }
  
  // Retry on provider errors with 5xx status codes
  if (error.statusCode && error.statusCode >= 500) {
    return true;
  }
  
  // Retry on network errors
  const retryableErrorNames = [
    'NetworkingError',
    'TimeoutError',
    'RequestTimeout',
    'Throttling',
    'ServiceUnavailable',
  ];
  
  if (error.name && retryableErrorNames.includes(error.name)) {
    return true;
  }
  
  if (error.code && retryableErrorNames.includes(error.code)) {
    return true;
  }
  
  // Retry on AWS SES 5xx status codes
  if (error.$metadata?.httpStatusCode && error.$metadata.httpStatusCode >= 500) {
    return true;
  }
  
  return false;
}

/**
 * Send email with retry logic (provider-agnostic)
 * 
 * Attempts to send an email with exponential backoff retry for transient errors.
 * 
 * @param provider - Email provider instance
 * @param params - Email parameters
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Email provider response with message ID
 * @throws Error if all retry attempts fail
 */
async function sendEmailWithRetry(
  provider: EmailProvider,
  params: { from: string; to: string; subject: string; text: string; html?: string },
  maxRetries: number = 3
): Promise<EmailProviderResponse> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await provider.sendEmail(params);
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      
      console.warn(
        `[EMAIL SERVICE] Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`,
        `\n  Provider: ${provider.name}`,
        `\n  Error: ${error instanceof Error ? error.message : String(error)}`
      );
      
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Send an email using the configured provider
 * 
 * Provider selection (automatic):
 * 1. Resend (if RESEND_API_KEY is set)
 * 2. AWS SES (if AWS credentials are set)
 * 3. Console logging (development fallback)
 * 
 * In development, this logs to console by default. To send real emails locally:
 * - Set ENABLE_EMAIL_SENDING=true in your .env file
 * - Configure email provider credentials (RESEND_API_KEY or AWS credentials)
 * 
 * In production, sends emails via configured provider with retry logic.
 * 
 * Includes pre-send suppression checks to prevent sending to suppressed addresses.
 * Logs all delivery attempts (sent, failed, suppressed) to the delivery log.
 * 
 * @param options - Email options including recipient, subject, and content
 * @param emailType - Type of email for logging purposes
 * @throws Error if email sending fails after all retry attempts or if recipient is suppressed
 */
export async function sendEmail(
  options: EmailOptions,
  emailType?: 'verification' | 'password_reset' | 'role_invitation'
): Promise<void> {
  const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
  const email = options.to.toLowerCase();
  
  // Check suppression list before sending
  const suppressed = await isRecipientSuppressed(email, 'email');
  
  if (suppressed) {
    const details = await getSuppressionDetails(email, 'email');
    const error = `Email suppressed due to ${details?.reason || 'unknown reason'}`;
    
    // Log suppression attempt to delivery log
    await logMessageDelivery({
      recipient: email,
      channel: 'email',
      subject: options.subject,
      messageType: emailType || 'unknown',
      status: 'suppressed',
      error,
    });
    
    throw new Error(error);
  }
  
  // Check if email provider is configured
  const hasProvider = isEmailProviderConfigured();
  const enableEmailSending = process.env.ENABLE_EMAIL_SENDING === 'true';
  
  // Determine if we should send real emails:
  // - In production with provider -> send
  // - In development with ENABLE_EMAIL_SENDING=true and provider -> send
  // - Otherwise -> log to console
  const shouldSendEmail = 
    hasProvider && 
    (process.env.NODE_ENV === 'production' || enableEmailSending);

  if (!shouldSendEmail) {
    console.log('\n=== EMAIL SENT (DEVELOPMENT MODE) ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('From:', fromEmail);
    console.log('Type:', emailType || 'unknown');
    console.log('\n--- Plain Text ---');
    console.log(options.text);
    if (options.html) {
      console.log('\n--- HTML Preview ---');
      console.log(options.html.substring(0, 500) + '...');
    }
    if (!hasProvider && process.env.NODE_ENV === 'production') {
      console.warn('[WARNING] No email provider configured. Email not sent.');
    }
    console.log('=====================================\n');
    
    // Log delivery attempt to delivery log
    if (emailType) {
      await logMessageDelivery({
        recipient: email,
        channel: 'email',
        subject: options.subject,
        messageType: emailType,
        status: 'sent',
        messageId: 'dev-mode-no-message-id',
      });
      
      // Keep legacy logging for backwards compatibility
      logEmailDelivery({
        type: emailType,
        to: options.to,
        subject: options.subject,
        status: 'sent',
        messageId: 'dev-mode-no-message-id',
        timestamp: new Date(),
      });
    }
    
    return;
  }

  // Send email via configured provider with retry logic
  try {
    const provider = getEmailProvider();
    
    const response = await sendEmailWithRetry(
      provider,
      {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      },
      3 // max retries
    );
    
    // Log successful delivery to delivery log
    if (emailType) {
      await logMessageDelivery({
        recipient: email,
        channel: 'email',
        subject: options.subject,
        messageType: emailType,
        status: 'sent',
        messageId: response.messageId,
      });
      
      // Keep legacy logging for backwards compatibility
      logEmailDelivery({
        type: emailType,
        to: options.to,
        subject: options.subject,
        status: 'sent',
        messageId: response.messageId,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    // Log failed delivery to delivery log
    if (emailType) {
      await logMessageDelivery({
        recipient: email,
        channel: 'email',
        subject: options.subject,
        messageType: emailType,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Keep legacy logging for backwards compatibility
      logEmailDelivery({
        type: emailType,
        to: options.to,
        subject: options.subject,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    }
    
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send email verification email
 * 
 * Sends a branded email verification message using the template system.
 * Includes rate limiting, suppression checks, error handling, and delivery logging.
 * 
 * @param data - Verification email data
 * @throws RateLimitError if rate limit is exceeded
 * @throws Error if email sending fails or recipient is suppressed
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  try {
    // Check rate limit before sending
    checkRateLimit(data.user.email, 'verification');
    
    const userName = data.user.name || data.user.email;
    
    // Create email template
    const templateData = createVerificationEmailTemplate({
      userName,
      verificationUrl: data.url,
    });
    
    // Build HTML and text versions
    const { html, text } = emailTemplateBuilder.build(templateData);
    
    // Send email with suppression check, retry logic, and delivery logging
    await sendEmail(
      {
        to: data.user.email,
        subject: templateData.subject,
        text,
        html,
      },
      'verification' // Pass emailType for suppression check and logging
    );
  } catch (error) {
    // Re-throw rate limit errors with original details
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    console.error('[EMAIL SERVICE] Failed to send verification email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 * 
 * Sends a branded password reset message using the template system.
 * Includes rate limiting, suppression checks, error handling, and delivery logging.
 * 
 * @param data - Password reset email data
 * @throws RateLimitError if rate limit is exceeded
 * @throws Error if email sending fails or recipient is suppressed
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  try {
    // Check rate limit before sending
    checkRateLimit(data.user.email, 'password_reset');
    
    const userName = data.user.name || data.user.email;
    
    // Create email template
    const templateData = createPasswordResetEmailTemplate({
      userName,
      resetUrl: data.url,
    });
    
    // Build HTML and text versions
    const { html, text } = emailTemplateBuilder.build(templateData);
    
    // Send email with suppression check, retry logic, and delivery logging
    await sendEmail(
      {
        to: data.user.email,
        subject: templateData.subject,
        text,
        html,
      },
      'password_reset' // Pass emailType for suppression check and logging
    );
  } catch (error) {
    // Re-throw rate limit errors with original details
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    console.error('[EMAIL SERVICE] Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send role upgrade invitation email
 * 
 * Sends a branded role invitation message using the template system.
 * Includes rate limiting, suppression checks, error handling, and delivery logging.
 * 
 * Note: Rate limiting for role invitations is based on the inviter's email
 * to prevent abuse by administrators.
 * 
 * @param data - Role invitation email data
 * @throws RateLimitError if rate limit is exceeded
 * @throws Error if email sending fails or recipient is suppressed
 */
export async function sendRoleInvitationEmail(data: InvitationEmailData): Promise<void> {
  try {
    // Check rate limit before sending (based on inviter to prevent admin abuse)
    checkRateLimit(data.invitedBy.email, 'role_invitation');
    
    const inviterName = data.invitedBy.name || data.invitedBy.email;
    
    // Create email template
    const templateData = createRoleInvitationEmailTemplate({
      role: data.role,
      inviterName,
      invitationUrl: data.url,
    });
    
    // Build HTML and text versions
    const { html, text } = emailTemplateBuilder.build(templateData);
    
    // Send email with suppression check, retry logic, and delivery logging
    await sendEmail(
      {
        to: data.email,
        subject: templateData.subject,
        text,
        html,
      },
      'role_invitation' // Pass emailType for suppression check and logging
    );
  } catch (error) {
    // Re-throw rate limit errors with original details
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    console.error('[EMAIL SERVICE] Failed to send role invitation email:', error);
    throw error;
  }
}

