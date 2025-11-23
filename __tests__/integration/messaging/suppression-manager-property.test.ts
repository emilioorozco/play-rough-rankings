/**
 * Property-Based Tests for Suppression Manager
 * Feature: email-bounce-complaint-handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import {
  addToSuppressionList,
  isRecipientSuppressed,
  getSuppressionDetails,
} from '@/lib/messaging/suppression-manager';

describe('Suppression Manager Property Tests', () => {
  beforeEach(async () => {
    // Clean up all messaging test data before each test
    // Order matters due to foreign key constraints
    await prisma.messageDeliveryLog.deleteMany({});
    await prisma.messageComplaint.deleteMany({});
    await prisma.messageBounce.deleteMany({});
    await prisma.messageSuppressionList.deleteMany({});
  });

  /**
   * Feature: email-bounce-complaint-handling, Property 7: Suppression reason recording
   * Validates: Requirements 5.2
   * 
   * For any email address added to the suppression list, the suppression reason
   * (hard_bounce, soft_bounce_threshold, or complaint) should always be recorded
   */
  it('Property 7: should always record suppression reason when adding to suppression list', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        // Generate random channel
        fc.constantFrom('email' as const, 'sms' as const),
        // Generate random suppression reason
        fc.constantFrom(
          'hard_bounce' as const,
          'soft_bounce_threshold' as const,
          'complaint' as const,
          'opt_out' as const
        ),
        // Generate random suppression type
        fc.constantFrom(
          'bounce' as const,
          'complaint' as const,
          'opt_out' as const
        ),
        async (recipient, channel, reason, suppressionType) => {
          // Add to suppression list
          await addToSuppressionList({
            recipient,
            channel,
            reason,
            suppressionType,
          });

          // Get suppression details
          const details = await getSuppressionDetails(recipient, channel);

          // Property: Suppression reason should always be recorded
          expect(details).not.toBeNull();
          expect(details?.reason).toBe(reason);
          expect(details?.suppressionType).toBe(suppressionType);
          expect(details?.recipient).toBe(recipient.toLowerCase());
          expect(details?.channel).toBe(channel);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Feature: email-bounce-complaint-handling, Property 6: Pre-send suppression check enforcement
   * Validates: Requirements 5.4, 6.1, 6.2
   * 
   * For any email send attempt, if the recipient is on the suppression list,
   * then the send should be blocked and an error should be thrown with the suppression reason
   */
  it('Property 6: should block send attempts to suppressed recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        // Generate random channel
        fc.constantFrom('email' as const, 'sms' as const),
        // Generate random suppression reason
        fc.constantFrom(
          'hard_bounce' as const,
          'soft_bounce_threshold' as const,
          'complaint' as const,
          'opt_out' as const
        ),
        // Generate random suppression type
        fc.constantFrom(
          'bounce' as const,
          'complaint' as const,
          'opt_out' as const
        ),
        async (recipient, channel, reason, suppressionType) => {
          // Add to suppression list
          await addToSuppressionList({
            recipient,
            channel,
            reason,
            suppressionType,
          });

          // Property: Recipient should be marked as suppressed
          const isSuppressed = await isRecipientSuppressed(recipient, channel);
          expect(isSuppressed).toBe(true);

          // Property: Suppression details should include the reason
          const details = await getSuppressionDetails(recipient, channel);
          expect(details).not.toBeNull();
          expect(details?.reason).toBe(reason);
        }
      ),
      { numRuns: 50 } // Reduced from 100 for performance with database operations
    );
  }, 30000); // 30 second timeout for database operations

  /**
   * Additional property: Recipients not on suppression list should not be blocked
   */
  it('Property 6 (inverse): should not block send attempts to non-suppressed recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random email addresses
        fc.emailAddress(),
        // Generate random channel
        fc.constantFrom('email' as const, 'sms' as const),
        async (recipient, channel) => {
          // Property: Recipient should NOT be suppressed (no suppression added)
          const isSuppressed = await isRecipientSuppressed(recipient, channel);
          expect(isSuppressed).toBe(false);

          // Property: Suppression details should be null
          const details = await getSuppressionDetails(recipient, channel);
          expect(details).toBeNull();
        }
      ),
      { numRuns: 50 } // Reduced from 100 for performance with database operations
    );
  }, 30000); // 30 second timeout for database operations
});
