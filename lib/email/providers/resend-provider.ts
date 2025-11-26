/**
 * Resend Email Provider Implementation
 * 
 * Implements the EmailProvider interface for Resend API.
 * Handles Resend-specific error mapping and response formatting.
 */

import { resendClient } from './resend-client';
import {
  EmailProvider,
  EmailSendParams,
  EmailProviderResponse,
  EmailProviderError,
  EmailRateLimitError,
} from './types';

/**
 * Resend email provider implementation
 * Implements the EmailProvider interface for Resend API
 */
export class ResendProvider implements EmailProvider {
  readonly name = 'Resend';
  
  /**
   * Send email via Resend API
   */
  async sendEmail(params: EmailSendParams): Promise<EmailProviderResponse> {
    try {
      const result = await resendClient.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      
      // Resend returns { id: string } on success
      return {
        success: true,
        messageId: result.data?.id,
      };
      
    } catch (error: any) {
      // Handle Resend-specific errors
      if (error.statusCode === 429) {
        // Rate limit error
        throw new EmailRateLimitError(
          this.name,
          error.headers?.['retry-after'] ? parseInt(error.headers['retry-after'], 10) : undefined,
          error
        );
      }
      
      // Map other Resend errors to standard format
      const errorMessage = error.message || 'Unknown Resend error';
      throw new EmailProviderError(errorMessage, this.name, error);
    }
  }
}

// Export singleton instance
export const resendProvider = new ResendProvider();

