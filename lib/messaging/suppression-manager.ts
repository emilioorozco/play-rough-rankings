// lib/messaging/suppression-manager.ts
import { prisma } from '@/lib/prisma';

/**
 * Add recipient to suppression list (channel-agnostic)
 * Uses upsert for atomic operation to handle concurrent requests
 */
export async function addToSuppressionList(data: {
  recipient: string;
  channel: 'email' | 'sms';
  reason: 'hard_bounce' | 'soft_bounce_threshold' | 'complaint' | 'opt_out';
  suppressionType: 'bounce' | 'complaint' | 'opt_out';
}) {
  const recipient = data.recipient.toLowerCase();
  
  try {
    const result = await prisma.messageSuppressionList.upsert({
      where: {
        recipient_channel: {
          recipient,
          channel: data.channel,
        },
      },
      create: {
        recipient,
        channel: data.channel,
        reason: data.reason,
        suppressionType: data.suppressionType,
      },
      update: {
        reason: data.reason,
        suppressionType: data.suppressionType,
        updatedAt: new Date(),
      },
    });
    
    return result;
  } catch (error) {
    console.error('Error upserting suppression:', error);
    throw error;
  }
}

/**
 * Check if recipient is suppressed (channel-agnostic)
 * Returns true if recipient is on suppression list with actual suppression reason
 * Excludes tracking-only records (soft_bounce_tracking)
 */
export async function isRecipientSuppressed(
  recipient: string,
  channel: 'email' | 'sms'
): Promise<boolean> {
  const suppression = await prisma.messageSuppressionList.findUnique({
    where: {
      recipient_channel: {
        recipient: recipient.toLowerCase(),
        channel,
      },
    },
  });
  
  // Only consider actually suppressed (not just tracking)
  if (!suppression) return false;
  
  const suppressionReasons = ['hard_bounce', 'soft_bounce_threshold', 'complaint', 'opt_out'];
  return suppressionReasons.includes(suppression.reason);
}

/**
 * Get suppression details for a recipient (channel-agnostic)
 * Returns suppression record with reason, type, and timestamps
 */
export async function getSuppressionDetails(recipient: string, channel: 'email' | 'sms') {
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
 * Remove from suppression list (admin only, channel-agnostic)
 * Permanently removes recipient from suppression list
 */
export async function removeFromSuppressionList(recipient: string, channel: 'email' | 'sms') {
  await prisma.messageSuppressionList.delete({
    where: {
      recipient_channel: {
        recipient: recipient.toLowerCase(),
        channel,
      },
    },
  });
}

/**
 * Increment soft bounce count (channel-agnostic)
 * Tracks soft bounces and returns updated count
 * Creates suppression record if it doesn't exist
 */
export async function incrementSoftBounceCount(
  recipient: string,
  channel: 'email' | 'sms'
): Promise<number> {
  const recipientLower = recipient.toLowerCase();
  
  try {
    // Use upsert to handle race conditions atomically
    // This ensures we don't have issues with findUnique -> create/update race conditions
    const updated = await prisma.messageSuppressionList.upsert({
      where: {
        recipient_channel: {
          recipient: recipientLower,
          channel,
        },
      },
      create: {
        recipient: recipientLower,
        channel,
        reason: 'soft_bounce_tracking',
        suppressionType: 'bounce',
        bounceCount: 1,
        lastBounceAt: new Date(),
      },
      update: {
        bounceCount: { increment: 1 },
        lastBounceAt: new Date(),
        // Preserve existing reason and suppressionType if they're not tracking-only
        // Only update if current reason is soft_bounce_tracking
      },
    });
    
    return updated.bounceCount;
  } catch (error) {
    console.error('Error incrementing soft bounce count:', error);
    throw error;
  }
}

/**
 * Get all suppressed recipients (admin only, channel-agnostic)
 * Supports pagination and filtering by channel and reason
 */
export async function getAllSuppressedRecipients(options?: {
  limit?: number;
  offset?: number;
  channel?: 'email' | 'sms';
  reason?: string;
}) {
  return prisma.messageSuppressionList.findMany({
    where: {
      channel: options?.channel,
      reason: options?.reason,
    },
    take: options?.limit || 100,
    skip: options?.offset || 0,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get suppression statistics (channel-agnostic)
 * Returns counts by suppression reason
 */
export async function getSuppressionStats(channel?: 'email' | 'sms') {
  const where = channel ? { channel } : undefined;
  
  const [total, hardBounces, softBounces, complaints] = await Promise.all([
    prisma.messageSuppressionList.count({ where }),
    prisma.messageSuppressionList.count({ where: { ...where, reason: 'hard_bounce' } }),
    prisma.messageSuppressionList.count({ where: { ...where, reason: 'soft_bounce_threshold' } }),
    prisma.messageSuppressionList.count({ where: { ...where, reason: 'complaint' } }),
  ]);
  
  return {
    total,
    hardBounces,
    softBounces,
    complaints,
  };
}
