// lib/messaging/delivery-logger.ts
import { prisma } from '@/lib/prisma';

/**
 * Log message delivery attempt (channel-agnostic)
 * 
 * Logs all email/SMS delivery attempts with status, message ID, and error details.
 * Supports filtering by recipient, channel, status, message type, and date range.
 * 
 * @param data - Delivery log data including recipient, channel, status, and metadata
 */
export async function logMessageDelivery(data: {
  recipient: string;
  channel: 'email' | 'sms';
  subject?: string;
  messageType: string;
  status: 'sent' | 'failed' | 'suppressed' | 'bounced' | 'complained';
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}) {
  await prisma.messageDeliveryLog.create({
    data: {
      recipient: data.recipient.toLowerCase(),
      channel: data.channel,
      subject: data.subject,
      messageType: data.messageType,
      status: data.status,
      messageId: data.messageId,
      error: data.error,
      metadata: data.metadata,
    },
  });
}

/**
 * Get delivery logs with filtering (channel-agnostic)
 * 
 * Retrieves delivery logs based on various filter criteria:
 * - recipient: Filter by email address or phone number
 * - channel: Filter by communication channel (email/sms)
 * - status: Filter by delivery status
 * - messageType: Filter by message type (verification, password_reset, etc.)
 * - dateFrom/dateTo: Filter by date range
 * - limit/offset: Pagination support
 * 
 * @param options - Filter options for querying delivery logs
 * @returns Array of delivery log records matching the criteria
 */
export async function getDeliveryLogs(options?: {
  recipient?: string;
  channel?: 'email' | 'sms';
  status?: 'sent' | 'failed' | 'suppressed' | 'bounced' | 'complained';
  messageType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  
  if (options?.recipient) {
    where.recipient = options.recipient.toLowerCase();
  }
  
  if (options?.channel) {
    where.channel = options.channel;
  }
  
  if (options?.status) {
    where.status = options.status;
  }
  
  if (options?.messageType) {
    where.messageType = options.messageType;
  }
  
  if (options?.dateFrom || options?.dateTo) {
    where.sentAt = {};
    if (options.dateFrom) {
      where.sentAt.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.sentAt.lte = options.dateTo;
    }
  }
  
  return prisma.messageDeliveryLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

/**
 * Get delivery statistics (channel-agnostic)
 * 
 * Calculates comprehensive delivery statistics including:
 * - Total delivery attempts
 * - Successful sends
 * - Failed sends
 * - Suppressed attempts
 * - Bounces and complaints
 * - Success rate percentage
 * 
 * Optionally filtered by channel and date range for targeted analysis.
 * 
 * @param options - Filter options for statistics calculation
 * @returns Object containing delivery statistics
 */
export async function getDeliveryStats(options?: {
  channel?: 'email' | 'sms';
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: any = {};
  
  if (options?.channel) {
    where.channel = options.channel;
  }
  
  if (options?.dateFrom || options?.dateTo) {
    where.sentAt = {};
    if (options.dateFrom) {
      where.sentAt.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.sentAt.lte = options.dateTo;
    }
  }
  
  const [total, sent, failed, suppressed, bounced, complained] = await Promise.all([
    prisma.messageDeliveryLog.count({ where }),
    prisma.messageDeliveryLog.count({ where: { ...where, status: 'sent' } }),
    prisma.messageDeliveryLog.count({ where: { ...where, status: 'failed' } }),
    prisma.messageDeliveryLog.count({ where: { ...where, status: 'suppressed' } }),
    prisma.messageDeliveryLog.count({ where: { ...where, status: 'bounced' } }),
    prisma.messageDeliveryLog.count({ where: { ...where, status: 'complained' } }),
  ]);
  
  const successRate = total > 0 ? (sent / total) * 100 : 0;
  
  return {
    total,
    sent,
    failed,
    suppressed,
    bounced,
    complained,
    successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
  };
}
