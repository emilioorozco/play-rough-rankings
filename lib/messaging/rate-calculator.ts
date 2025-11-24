// lib/messaging/rate-calculator.ts
import { prisma } from '@/lib/prisma';

/**
 * Email metrics interface for bounce and complaint rates
 */
export interface EmailMetrics {
  totalSent: number;
  totalBounces: number;
  totalComplaints: number;
  bounceRate: number; // Percentage (0-100)
  complaintRate: number; // Percentage (0-100)
  bounceWarning: boolean; // True if bounce rate exceeds 3%
  complaintWarning: boolean; // True if complaint rate exceeds 0.05%
  periodDays: number;
  calculatedAt: Date;
}

/**
 * Warning thresholds for AWS SES compliance
 * - Bounce rate: 3% warning threshold (AWS limit is 5%)
 * - Complaint rate: 0.05% warning threshold (AWS limit is 0.1%)
 */
const BOUNCE_WARNING_THRESHOLD = 3.0; // 3%
const COMPLAINT_WARNING_THRESHOLD = 0.05; // 0.05%

/**
 * Calculate email metrics including bounce and complaint rates
 * 
 * Calculates comprehensive email delivery metrics over a specified time period:
 * - Total sent emails (successful deliveries)
 * - Total bounces (hard and soft bounces)
 * - Total complaints (spam reports)
 * - Bounce rate as percentage
 * - Complaint rate as percentage
 * - Warning flags for threshold violations
 * 
 * Requirements:
 * - 7.1: Calculate bounce rate as (total bounces / total sent emails) over the last 30 days
 * - 7.2: Calculate complaint rate as (total complaints / total sent emails) over the last 30 days
 * - 7.4: Log warnings when bounce rate exceeds 3% (approaching AWS 5% limit)
 * - 7.5: Log warnings when complaint rate exceeds 0.05% (approaching AWS 0.1% limit)
 * 
 * @param options - Calculation options
 * @param options.channel - Communication channel (default: 'email')
 * @param options.days - Number of days to look back (default: 30)
 * @returns Email metrics including rates and warning flags
 */
export async function calculateEmailMetrics(options?: {
  channel?: 'email' | 'sms';
  days?: number;
}): Promise<EmailMetrics> {
  const channel = options?.channel || 'email';
  const days = options?.days || 30;
  
  // Calculate date range
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  const dateTo = new Date();
  
  // Get total sent emails (successful deliveries)
  const totalSent = (await prisma.messageDeliveryLog.count({
    where: {
      channel,
      status: 'sent',
      sentAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
  })) ?? 0;
  
  // Get total bounces (all bounce types)
  const totalBounces = (await prisma.messageBounce.count({
    where: {
      channel,
      timestamp: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
  })) ?? 0;
  
  // Get total complaints
  const totalComplaints = (await prisma.messageComplaint.count({
    where: {
      channel,
      timestamp: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
  })) ?? 0;
  
  // Calculate rates as percentages
  // If no emails were sent, rates are 0%
  const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
  const complaintRate = totalSent > 0 ? (totalComplaints / totalSent) * 100 : 0;
  
  // Check warning thresholds
  const bounceWarning = bounceRate >= BOUNCE_WARNING_THRESHOLD;
  const complaintWarning = complaintRate >= COMPLAINT_WARNING_THRESHOLD;
  
  // Log warnings if thresholds exceeded
  if (bounceWarning) {
    console.warn(
      `⚠️ BOUNCE RATE WARNING: ${bounceRate.toFixed(2)}% exceeds ${BOUNCE_WARNING_THRESHOLD}% threshold ` +
      `(AWS limit: 5%). Total bounces: ${totalBounces}, Total sent: ${totalSent}`
    );
  }
  
  if (complaintWarning) {
    console.warn(
      `⚠️ COMPLAINT RATE WARNING: ${complaintRate.toFixed(4)}% exceeds ${COMPLAINT_WARNING_THRESHOLD}% threshold ` +
      `(AWS limit: 0.1%). Total complaints: ${totalComplaints}, Total sent: ${totalSent}`
    );
  }
  
  return {
    totalSent,
    totalBounces,
    totalComplaints,
    bounceRate: Math.round(bounceRate * 100) / 100, // Round to 2 decimal places
    complaintRate: Math.round(complaintRate * 10000) / 10000, // Round to 4 decimal places
    bounceWarning,
    complaintWarning,
    periodDays: days,
    calculatedAt: new Date(),
  };
}

/**
 * Get detailed bounce rate breakdown
 * 
 * Provides detailed breakdown of bounce types:
 * - Hard bounces (permanent failures)
 * - Soft bounces (transient failures)
 * - Total bounce rate
 * 
 * @param options - Calculation options
 * @returns Detailed bounce rate metrics
 */
export async function getBounceRateBreakdown(options?: {
  channel?: 'email' | 'sms';
  days?: number;
}) {
  const channel = options?.channel || 'email';
  const days = options?.days || 30;
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  const dateTo = new Date();
  
  const totalSent = (await prisma.messageDeliveryLog.count({
    where: {
      channel,
      status: 'sent',
      sentAt: { gte: dateFrom, lte: dateTo },
    },
  })) ?? 0;
  
  const hardBounces = (await prisma.messageBounce.count({
    where: {
      channel,
      bounceType: 'Permanent',
      timestamp: { gte: dateFrom, lte: dateTo },
    },
  })) ?? 0;
  
  const softBounces = (await prisma.messageBounce.count({
    where: {
      channel,
      bounceType: 'Transient',
      timestamp: { gte: dateFrom, lte: dateTo },
    },
  })) ?? 0;
  
  const totalBounces = hardBounces + softBounces;
  
  return {
    totalSent,
    hardBounces,
    softBounces,
    totalBounces,
    hardBounceRate: totalSent > 0 ? (hardBounces / totalSent) * 100 : 0,
    softBounceRate: totalSent > 0 ? (softBounces / totalSent) * 100 : 0,
    totalBounceRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
  };
}

/**
 * Check if current rates exceed AWS SES thresholds
 * 
 * Validates that bounce and complaint rates are within AWS SES limits:
 * - Bounce rate must be below 5%
 * - Complaint rate must be below 0.1%
 * 
 * @param options - Calculation options
 * @returns Compliance status with detailed information
 */
export async function checkSESCompliance(options?: {
  channel?: 'email' | 'sms';
  days?: number;
}) {
  const metrics = await calculateEmailMetrics(options);
  
  const AWS_BOUNCE_LIMIT = 5.0; // 5%
  const AWS_COMPLAINT_LIMIT = 0.1; // 0.1%
  
  const bounceCompliant = metrics.bounceRate < AWS_BOUNCE_LIMIT;
  const complaintCompliant = metrics.complaintRate < AWS_COMPLAINT_LIMIT;
  const overallCompliant = bounceCompliant && complaintCompliant;
  
  return {
    compliant: overallCompliant,
    bounceCompliant,
    complaintCompliant,
    metrics,
    limits: {
      bounceLimit: AWS_BOUNCE_LIMIT,
      complaintLimit: AWS_COMPLAINT_LIMIT,
    },
  };
}

