// lib/messaging/bounce-processor.ts
import { prisma } from '@/lib/prisma';
import { addToSuppressionList, incrementSoftBounceCount } from './suppression-manager';
import { calculateEmailMetrics } from './rate-calculator';

/**
 * Process bounce notification from AWS SNS
 * Handles both hard bounces (immediate suppression) and soft bounces (threshold-based suppression)
 */
export async function processBounce(bounce: any, mail: any) {
  if (!bounce.bouncedRecipients || bounce.bouncedRecipients.length === 0) {
    return;
  }
  
  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress.toLowerCase();
    
    try {
      // Log bounce to channel-agnostic database model
      await logBounce({
        recipient: email,
        channel: 'email', // Specify channel for this email implementation
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        diagnosticCode: recipient.diagnosticCode,
        action: recipient.action,
        status: recipient.status,
        feedbackId: bounce.feedbackId,
        messageId: mail.messageId,
        timestamp: new Date(bounce.timestamp),
      });
    } catch (error) {
      console.error('Error logging bounce for', email, ':', error);
      throw error;
    }
    
    // Handle based on bounce type
    if (bounce.bounceType === 'Permanent') {
      // Hard bounce - immediately suppress
      await addToSuppressionList({
        recipient: email,
        channel: 'email', // Specify channel
        reason: 'hard_bounce',
        suppressionType: 'bounce',
      });
      
    } else if (bounce.bounceType === 'Transient') {
      // Soft bounce - track and check threshold
      const softBounceCount = await incrementSoftBounceCount(email, 'email');
      
      // Suppress after 3 soft bounces in 30 days
      if (softBounceCount >= 3) {
        await addToSuppressionList({
          recipient: email,
          channel: 'email', // Specify channel
          reason: 'soft_bounce_threshold',
          suppressionType: 'bounce',
        });
      }
    }
  }
  
  // Calculate and log current email metrics after processing bounces
  // This helps monitor bounce rates in real-time
  try {
    await calculateEmailMetrics({ channel: 'email' });
  } catch (error) {
    console.error('Failed to calculate email metrics after bounce processing:', error);
  }
}

/**
 * Log bounce event to channel-agnostic database model
 */
async function logBounce(data: {
  recipient: string;
  channel: string;
  bounceType: string;
  bounceSubType: string;
  diagnosticCode?: string;
  action?: string;
  status?: string;
  feedbackId?: string;
  messageId?: string;
  timestamp: Date;
}) {
  try {
    const result = await prisma.messageBounce.create({
      data: {
        recipient: data.recipient,
        channel: data.channel,
        bounceType: data.bounceType,
        bounceSubType: data.bounceSubType,
        diagnosticCode: data.diagnosticCode,
        action: data.action,
        status: data.status,
        feedbackId: data.feedbackId,
        messageId: data.messageId,
        timestamp: data.timestamp,
      },
    });
    
    return result;
  } catch (error) {
    console.error('Error creating bounce record:', error);
    throw error;
  }
}

/**
 * Get bounce history for a recipient (channel-agnostic)
 */
export async function getBounceHistory(recipient: string, channel: string = 'email') {
  return prisma.messageBounce.findMany({
    where: { 
      recipient: recipient.toLowerCase(),
      channel,
    },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Get soft bounce count in last 30 days (channel-agnostic)
 */
export async function getSoftBounceCount(recipient: string, channel: string = 'email'): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const count = await prisma.messageBounce.count({
    where: {
      recipient: recipient.toLowerCase(),
      channel,
      bounceType: 'Transient',
      timestamp: { gte: thirtyDaysAgo },
    },
  });
  
  return count;
}
