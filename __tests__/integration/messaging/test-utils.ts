/**
 * Test Utilities for Email Bounce/Complaint Handling
 * 
 * This file provides helper functions for creating mock SNS notifications
 * and cleaning up test data for the email bounce and complaint handling system.
 */

import { prisma } from '@/lib/prisma';

/**
 * Generate a unique test email address to avoid collisions in parallel tests
 * 
 * @param prefix - Optional prefix for the email (default: 'test')
 * @returns Unique email address
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Create a mock SNS bounce notification
 * 
 * @param overrides - Optional overrides for bounce notification fields
 * @returns Mock SNS bounce notification object
 */
export function createMockBounceNotification(overrides: {
  emailAddress?: string;
  bounceType?: 'Permanent' | 'Transient' | 'Undetermined';
  bounceSubType?: string;
  diagnosticCode?: string;
  action?: string;
  status?: string;
  feedbackId?: string;
  messageId?: string;
  timestamp?: string;
  source?: string;
} = {}) {
  const defaultEmail = overrides.emailAddress || 'bounce@example.com';
  const defaultTimestamp = overrides.timestamp || new Date().toISOString();
  const defaultMessageId = overrides.messageId || `msg-${Date.now()}`;
  const defaultFeedbackId = overrides.feedbackId || `feedback-${Date.now()}`;

  return {
    notificationType: 'Bounce' as const,
    bounce: {
      bounceType: overrides.bounceType || 'Permanent',
      bounceSubType: overrides.bounceSubType || 'General',
      bouncedRecipients: [
        {
          emailAddress: defaultEmail,
          action: overrides.action || 'failed',
          status: overrides.status || '5.1.1',
          diagnosticCode: overrides.diagnosticCode || 'smtp; 550 5.1.1 user unknown',
        },
      ],
      timestamp: defaultTimestamp,
      feedbackId: defaultFeedbackId,
    },
    mail: {
      timestamp: defaultTimestamp,
      source: overrides.source || 'noreply@playroughrankings.com',
      messageId: defaultMessageId,
      destination: [defaultEmail],
    },
  };
}

/**
 * Create a mock SNS complaint notification
 * 
 * @param overrides - Optional overrides for complaint notification fields
 * @returns Mock SNS complaint notification object
 */
export function createMockComplaintNotification(overrides: {
  emailAddress?: string;
  complaintFeedbackType?: string;
  userAgent?: string;
  feedbackId?: string;
  messageId?: string;
  timestamp?: string;
  source?: string;
} = {}) {
  const defaultEmail = overrides.emailAddress || 'complaint@example.com';
  const defaultTimestamp = overrides.timestamp || new Date().toISOString();
  const defaultMessageId = overrides.messageId || `msg-${Date.now()}`;
  const defaultFeedbackId = overrides.feedbackId || `feedback-${Date.now()}`;

  return {
    notificationType: 'Complaint' as const,
    complaint: {
      complainedRecipients: [
        {
          emailAddress: defaultEmail,
        },
      ],
      timestamp: defaultTimestamp,
      feedbackId: defaultFeedbackId,
      userAgent: overrides.userAgent || 'Mozilla/5.0',
      complaintFeedbackType: overrides.complaintFeedbackType || 'abuse',
    },
    mail: {
      timestamp: defaultTimestamp,
      source: overrides.source || 'noreply@playroughrankings.com',
      messageId: defaultMessageId,
      destination: [defaultEmail],
    },
  };
}

/**
 * Create a mock SNS subscription confirmation message
 * 
 * @param subscribeURL - The subscription URL to confirm
 * @returns Mock SNS subscription confirmation object
 */
export function createMockSubscriptionConfirmation(subscribeURL: string = 'https://sns.us-west-2.amazonaws.com/confirm') {
  return {
    Type: 'SubscriptionConfirmation',
    MessageId: `sub-${Date.now()}`,
    Token: `token-${Date.now()}`,
    TopicArn: 'arn:aws:sns:us-west-2:123456789:ses-bounces-complaints',
    Message: 'You have chosen to subscribe to the topic',
    SubscribeURL: subscribeURL,
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'mock-signature',
    SigningCertURL: 'https://sns.us-west-2.amazonaws.com/cert.pem',
  };
}

/**
 * Create a mock SNS notification wrapper
 * 
 * @param notification - The bounce or complaint notification
 * @returns Mock SNS message wrapper
 */
export function createMockSNSMessage(notification: any) {
  return {
    Type: 'Notification',
    MessageId: `sns-${Date.now()}`,
    TopicArn: 'arn:aws:sns:us-west-2:123456789:ses-bounces-complaints',
    Subject: 'Amazon SES Email Event Notification',
    Message: JSON.stringify(notification),
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'mock-signature',
    SigningCertURL: 'https://sns.us-west-2.amazonaws.com/cert.pem',
    UnsubscribeURL: 'https://sns.us-west-2.amazonaws.com/unsubscribe',
  };
}

/**
 * Clear all test data from bounce/complaint tables
 * 
 * This function removes all test data from the messaging tables
 * to ensure a clean state for tests.
 */
export async function clearTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.messageDeliveryLog.deleteMany();
  await prisma.messageComplaint.deleteMany();
  await prisma.messageBounce.deleteMany();
  await prisma.messageSuppressionList.deleteMany();
}

/**
 * Create test bounce data in the database
 * 
 * @param data - Bounce data to create
 * @returns Created bounce record
 */
export async function createTestBounce(data: {
  recipient: string;
  channel?: string;
  bounceType?: string;
  bounceSubType?: string;
  diagnosticCode?: string;
  timestamp?: Date;
}) {
  return prisma.messageBounce.create({
    data: {
      recipient: data.recipient.toLowerCase(),
      channel: data.channel || 'email',
      bounceType: data.bounceType || 'Permanent',
      bounceSubType: data.bounceSubType || 'General',
      diagnosticCode: data.diagnosticCode || 'smtp; 550 5.1.1 user unknown',
      timestamp: data.timestamp || new Date(),
    },
  });
}

/**
 * Create test complaint data in the database
 * 
 * @param data - Complaint data to create
 * @returns Created complaint record
 */
export async function createTestComplaint(data: {
  recipient: string;
  channel?: string;
  complaintType?: string;
  timestamp?: Date;
}) {
  return prisma.messageComplaint.create({
    data: {
      recipient: data.recipient.toLowerCase(),
      channel: data.channel || 'email',
      complaintType: data.complaintType || 'abuse',
      timestamp: data.timestamp || new Date(),
    },
  });
}

/**
 * Create test suppression list entry
 * 
 * @param data - Suppression data to create
 * @returns Created suppression record
 */
export async function createTestSuppression(data: {
  recipient: string;
  channel?: string;
  reason?: string;
  suppressionType?: string;
  bounceCount?: number;
}) {
  return prisma.messageSuppressionList.create({
    data: {
      recipient: data.recipient.toLowerCase(),
      channel: data.channel || 'email',
      reason: data.reason || 'hard_bounce',
      suppressionType: data.suppressionType || 'bounce',
      bounceCount: data.bounceCount || 0,
    },
  });
}

/**
 * Create test delivery log entry
 * 
 * @param data - Delivery log data to create
 * @returns Created delivery log record
 */
export async function createTestDeliveryLog(data: {
  recipient: string;
  channel?: string;
  messageType?: string;
  status?: string;
  subject?: string;
  messageId?: string;
  error?: string;
}) {
  return prisma.messageDeliveryLog.create({
    data: {
      recipient: data.recipient.toLowerCase(),
      channel: data.channel || 'email',
      messageType: data.messageType || 'verification',
      status: data.status || 'sent',
      subject: data.subject,
      messageId: data.messageId,
      error: data.error,
    },
  });
}

/**
 * Get all bounces for a recipient
 * 
 * @param recipient - Email address to query
 * @param channel - Channel to filter by (default: 'email')
 * @returns Array of bounce records
 */
export async function getTestBounces(recipient: string, channel: string = 'email') {
  const normalizedRecipient = recipient.toLowerCase();
  console.log('[DEBUG] getTestBounces querying:', { recipient: normalizedRecipient, channel });
  
  const results = await prisma.messageBounce.findMany({
    where: {
      recipient: normalizedRecipient,
      channel,
    },
    orderBy: { timestamp: 'desc' },
  });
  
  console.log('[DEBUG] getTestBounces found', results.length, 'records for', normalizedRecipient);
  if (results.length > 0) {
    console.log('[DEBUG] getTestBounces first result:', {
      id: results[0].id,
      recipient: results[0].recipient,
      bounceType: results[0].bounceType,
    });
  }
  
  return results;
}

/**
 * Get all complaints for a recipient
 * 
 * @param recipient - Email address to query
 * @param channel - Channel to filter by (default: 'email')
 * @returns Array of complaint records
 */
export async function getTestComplaints(recipient: string, channel: string = 'email') {
  const normalizedRecipient = recipient.toLowerCase();
  console.log('[DEBUG] getTestComplaints querying:', { recipient: normalizedRecipient, channel });
  
  const results = await prisma.messageComplaint.findMany({
    where: {
      recipient: normalizedRecipient,
      channel,
    },
    orderBy: { timestamp: 'desc' },
  });
  
  console.log('[DEBUG] getTestComplaints found', results.length, 'records for', normalizedRecipient);
  if (results.length > 0) {
    console.log('[DEBUG] getTestComplaints first result:', {
      id: results[0].id,
      recipient: results[0].recipient,
      complaintType: results[0].complaintType,
    });
  }
  
  return results;
}

/**
 * Get suppression status for a recipient
 * 
 * @param recipient - Email address to query
 * @param channel - Channel to filter by (default: 'email')
 * @returns Suppression record or null
 */
export async function getTestSuppression(recipient: string, channel: string = 'email') {
  return prisma.messageSuppressionList.findUnique({
    where: {
      recipient_channel: {
        recipient: recipient.toLowerCase(),
        channel,
      },
    },
  });
}

/**
 * Get all delivery logs for a recipient
 * 
 * @param recipient - Email address to query
 * @param channel - Channel to filter by (default: 'email')
 * @returns Array of delivery log records
 */
export async function getTestDeliveryLogs(recipient: string, channel: string = 'email') {
  return prisma.messageDeliveryLog.findMany({
    where: {
      recipient: recipient.toLowerCase(),
      channel,
    },
    orderBy: { sentAt: 'desc' },
  });
}
