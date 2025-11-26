/**
 * Resend Client Configuration
 * 
 * Initializes the Resend client with API key from environment variables.
 * 
 * Configuration:
 * - API Key: RESEND_API_KEY environment variable
 * 
 * The Resend client is initialized once and reused across requests.
 * In test environments, the client may be mocked and API key is optional.
 */

import { Resend } from 'resend';

/**
 * Initialize Resend client with API key
 * 
 * Note: In test environments, this may be mocked and API key is optional.
 * The actual Resend SDK will throw if API key is missing, but mocks handle this.
 */
export const resendClient = new Resend(process.env.RESEND_API_KEY || undefined);

/**
 * Check if Resend is configured
 * 
 * @returns True if RESEND_API_KEY is set
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

