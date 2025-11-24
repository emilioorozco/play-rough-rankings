/**
 * AWS SES Client Configuration
 * 
 * Centralized SES client initialization for email sending.
 * Supports both development and production environments.
 */

import { SESClient } from '@aws-sdk/client-ses';

/**
 * Initialize SES client with AWS credentials
 * 
 * Configuration:
 * - Region: AWS_REGION environment variable (defaults to us-west-2)
 * - Credentials: AWS_EMAIL_ACCESS_KEY_ID and AWS_EMAIL_SECRET_ACCESS_KEY
 * 
 * In development, credentials are optional and email will be logged to console.
 * In production, credentials are required for actual email sending.
 */
export const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: process.env.AWS_EMAIL_ACCESS_KEY_ID && process.env.AWS_EMAIL_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_EMAIL_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_EMAIL_SECRET_ACCESS_KEY,
      }
    : undefined,
});
