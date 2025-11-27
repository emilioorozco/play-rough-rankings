// lib/trpc/routers/email-metrics.ts
import { z } from 'zod';
import { router, adminProcedure } from '../router-factory';
import {
  calculateEmailMetrics,
  getBounceRateBreakdown,
  checkSESCompliance,
  getDeliveryStats,
  getAllSuppressedRecipients,
  getSuppressionStats,
} from '@/lib/messaging';
import type { EmailMetrics } from '@/lib/messaging/rate-calculator';

type SerializedEmailMetrics = Omit<EmailMetrics, 'calculatedAt'> & {
  calculatedAt: string;
};

const serializeEmailMetrics = (metrics: EmailMetrics): SerializedEmailMetrics => ({
  ...metrics,
  calculatedAt: metrics.calculatedAt.toISOString(),
});

type SESComplianceResult = Awaited<ReturnType<typeof checkSESCompliance>>;

type SerializedComplianceResult = Omit<SESComplianceResult, 'metrics'> & {
  metrics: SerializedEmailMetrics;
};

/**
 * Email Metrics Router
 * 
 * Provides admin-only endpoints for monitoring email delivery metrics,
 * bounce/complaint rates, and AWS SES compliance status.
 */
export const emailMetricsRouter = router({
  /**
   * Get email delivery metrics
   * Calculates bounce and complaint rates over specified time period
   */
  getMetrics: adminProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'sms']).optional().default('email'),
        days: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ input }): Promise<SerializedEmailMetrics> => {
      const metrics = await calculateEmailMetrics({
        channel: input.channel,
        days: input.days,
      });

      return serializeEmailMetrics(metrics);
    }),

  /**
   * Get detailed bounce rate breakdown
   * Shows hard vs soft bounce rates
   */
  getBounceBreakdown: adminProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'sms']).optional().default('email'),
        days: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ input }): Promise<unknown> => {
      return await getBounceRateBreakdown({
        channel: input.channel,
        days: input.days,
      });
    }),

  /**
   * Check AWS SES compliance status
   * Validates bounce and complaint rates against AWS limits
   */
  checkCompliance: adminProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'sms']).optional().default('email'),
        days: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ input }): Promise<SerializedComplianceResult> => {
      const compliance = await checkSESCompliance({
        channel: input.channel,
        days: input.days,
      });

      return {
        ...compliance,
        metrics: serializeEmailMetrics(compliance.metrics),
      };
    }),

  /**
   * Get delivery statistics
   * Returns counts of sent, failed, suppressed, bounced, and complained emails
   */
  getDeliveryStats: adminProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'sms']).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ input }): Promise<unknown> => {
      return await getDeliveryStats({
        channel: input.channel,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      });
    }),

  /**
   * Get suppression list statistics
   * Returns counts by suppression reason
   */
  getSuppressionStats: adminProcedure
    .input(
      z.object({
        channel: z.enum(['email', 'sms']).optional(),
      })
    )
    .query(async ({ input }): Promise<unknown> => {
      return await getSuppressionStats(input.channel);
    }),

  /**
   * Get suppressed recipients list
   * Returns paginated list of suppressed recipients
   */
  getSuppressedRecipients: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        channel: z.enum(['email', 'sms']).optional(),
        reason: z.string().optional(),
      })
    )
    .query(async ({ input }): Promise<{
      recipients: Array<unknown & {
        createdAt: string;
        updatedAt: string;
        lastBounceAt?: string;
      }>;
      total: number;
    }> => {
      const recipients = await getAllSuppressedRecipients({
        limit: input.limit,
        offset: input.offset,
        channel: input.channel,
        reason: input.reason,
      });

      return {
        recipients: recipients.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          lastBounceAt: r.lastBounceAt?.toISOString(),
        })),
        total: recipients.length,
      };
    }),
});

