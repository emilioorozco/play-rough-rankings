/**
 * Email Provider Abstraction Layer
 * 
 * Defines standard interfaces for email providers to allow easy switching
 * between different email services (Resend, AWS SES, etc.)
 */

/**
 * Standard email provider response
 * All providers must return this format
 */
export interface EmailProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email send parameters
 * Standard format that all providers accept
 */
export interface EmailSendParams {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Email provider interface
 * All email providers must implement this interface
 */
export interface EmailProvider {
  /**
   * Send an email
   * @param params - Email parameters
   * @returns Promise with send result
   */
  sendEmail(params: EmailSendParams): Promise<EmailProviderResponse>;
  
  /**
   * Provider name for logging
   */
  readonly name: string;
}

/**
 * Provider-specific error types
 */
export class EmailProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

export class EmailRateLimitError extends EmailProviderError {
  constructor(
    provider: string,
    public readonly retryAfter?: number,
    originalError?: any
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, originalError);
    this.name = 'EmailRateLimitError';
  }
}

