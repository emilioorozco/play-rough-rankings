// lib/messaging/bounce-processor.ts
import { prisma } from '@/lib/prisma';
import { addToSuppressionList, incrementSoftBounceCount } from './suppression-manager';
import { calculateEmailMetrics } from './rate-calculator';

/**
 * Process bounce notification from AWS SNS
 * Handles both hard bounces (immediate suppression) and soft bounces (threshold-based suppression)
 */
export async function processBounce(bounce: any, mail: any) {
  console.log('[DEBUG] processBounce called:', {
    bounceType: bounce.bounceType,
    bounceSubType: bounce.bounceSubType,
    recipients: bounce.bouncedRecipients?.length || 0,
    mailMessageId: mail?.messageId,
  });
  
  if (!bounce.bouncedRecipients || bounce.bouncedRecipients.length === 0) {
    console.warn('[DEBUG] No bounced recipients found in bounce notification');
    return;
  }
  
  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress.toLowerCase();
    console.log('[DEBUG] Processing bounce for recipient:', email);
    
    try {
      // Log bounce to channel-agnostic database model
      console.log('[DEBUG] Calling logBounce with data:', {
        recipient: email,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        messageId: mail.messageId,
      });
      
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
      
      console.log('[DEBUG] logBounce completed successfully for:', email);
    } catch (error) {
      console.error('[DEBUG] Error in logBounce for', email, ':', error);
      throw error; // Re-throw to see the actual error
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
      
      console.log(`Hard bounce: ${email} added to suppression list`);
      
    } else if (bounce.bounceType === 'Transient') {
      // Soft bounce - track and check threshold
      const softBounceCount = await incrementSoftBounceCount(email, 'email');
      
      console.log(`Soft bounce: ${email} (count: ${softBounceCount})`);
      
      // Suppress after 3 soft bounces in 30 days
      if (softBounceCount >= 3) {
        await addToSuppressionList({
          recipient: email,
          channel: 'email', // Specify channel
          reason: 'soft_bounce_threshold',
          suppressionType: 'bounce',
        });
        
        console.log(`Soft bounce threshold: ${email} added to suppression list`);
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
  console.log('[DEBUG] logBounce - Creating bounce record:', {
    recipient: data.recipient,
    channel: data.channel,
    bounceType: data.bounceType,
    messageId: data.messageId,
  });
  
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
    
    console.log('[DEBUG] logBounce - Successfully created bounce record:', {
      id: result.id,
      recipient: result.recipient,
      bounceType: result.bounceType,
    });
    
    return result;
  } catch (error) {
    console.error('[DEBUG] logBounce - Error creating bounce record:', error);
    console.error('[DEBUG] logBounce - Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
