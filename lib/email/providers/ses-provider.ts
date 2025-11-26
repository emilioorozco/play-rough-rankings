/**
 * AWS SES Email Provider Implementation
 * 
 * Implements the EmailProvider interface for AWS SES.
 * Handles AWS SES-specific error mapping and response formatting.
 */

import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '@/lib/aws/ses/client';
import {
  EmailProvider,
  EmailSendParams,
  EmailProviderResponse,
  EmailProviderError,
  EmailRateLimitError,
} from './types';

/**
 * AWS SES email provider implementation
 * Implements the EmailProvider interface for AWS SES
 */
export class SESProvider implements EmailProvider {
  readonly name = 'AWS SES';
  
  /**
   * Send email via AWS SES
   */
  async sendEmail(params: EmailSendParams): Promise<EmailProviderResponse> {
    try {
      const command = new SendEmailCommand({
        Source: params.from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(params.html
              ? {
                  Html: {
                    Data: params.html,
                    Charset: 'UTF-8',
                  },
                }
              : {}),
            Text: {
              Data: params.text,
              Charset: 'UTF-8',
            },
          },
        },
      });
      
      const response = await sesClient.send(command);
      
      return {
        success: true,
        messageId: response.MessageId,
      };
      
    } catch (error: any) {
      // Handle AWS SES-specific errors
      if (error.name === 'Throttling' || error.code === 'Throttling') {
        throw new EmailRateLimitError(this.name, undefined, error);
      }
      
      // Map other AWS errors to standard format
      const errorMessage = error.message || 'Unknown AWS SES error';
      throw new EmailProviderError(errorMessage, this.name, error);
    }
  }
}

// Export singleton instance
export const sesProvider = new SESProvider();

