/**
 * Email Service Utility
 * 
 * Provides email sending functionality for:
 * - Email verification
 * - Password reset
 * - Role upgrade invitations
 * 
 * Uses AWS SES for production email sending.
 * Falls back to console logging in development.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

/**
 * Send an email using AWS SES
 * 
 * In development, this logs to console if AWS credentials are not configured.
 * In production, sends emails via AWS SES.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@example.com';
  
  // Check if AWS credentials are configured
  const hasAwsCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );

  // In development or if AWS credentials are not configured, log to console
  if (process.env.NODE_ENV !== 'production' || !hasAwsCredentials) {
    console.log('\n=== EMAIL SENT ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('From:', fromEmail);
    console.log('Text:', options.text);
    if (options.html) {
      console.log('HTML:', options.html);
    }
    if (!hasAwsCredentials && process.env.NODE_ENV === 'production') {
      console.warn('[WARNING] AWS credentials not configured. Email not sent.');
    }
    console.log('==================\n');
    return;
  }

  // Send email via AWS SES
  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(options.html
            ? {
                Html: {
                  Data: options.html,
                  Charset: 'UTF-8',
                },
              }
            : {}),
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await sesClient.send(command);
    console.log('[EMAIL SERVICE] Email sent successfully:', response.MessageId);
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  const userName = data.user.name || data.user.email;
  
  await sendEmail({
    to: data.user.email,
    subject: 'Verify your email address',
    text: `Hello ${userName},\n\nPlease verify your email address by clicking the link below:\n\n${data.url}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${userName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${data.url}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.url}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
        <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const userName = data.user.name || data.user.email;
  
  await sendEmail({
    to: data.user.email,
    subject: 'Reset your password',
    text: `Hello ${userName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${data.url}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hello ${userName},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${data.url}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.url}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send role upgrade invitation email
 */
export async function sendRoleInvitationEmail(data: InvitationEmailData): Promise<void> {
  const roleName = data.role === 'admin' ? 'Administrator' : 'Tournament Organizer';
  const inviterName = data.invitedBy.name || data.invitedBy.email;
  
  await sendEmail({
    to: data.email,
    subject: `You've been invited to become a ${roleName}`,
    text: `Hello,\n\n${inviterName} has invited you to become a ${roleName} on Play Rough Rankings.\n\nClick the link below to accept the invitation:\n\n${data.url}\n\nThis invitation will expire in 7 days.\n\nIf you didn't expect this invitation, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've Been Invited!</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to become a <strong>${roleName}</strong> on Play Rough Rankings.</p>
        <p>Click the button below to accept the invitation:</p>
        <a href="${data.url}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.url}</p>
        <p style="color: #999; font-size: 12px;">This invitation will expire in 7 days.</p>
        <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}

