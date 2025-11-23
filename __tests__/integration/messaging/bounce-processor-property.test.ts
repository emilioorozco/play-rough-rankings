/**
 * Property-Based Tests for Bounce Processor
 * 
 * Feature: email-bounce-complaint-handling
 * 
 * These tests verify correctness properties for bounce processing:
 * - Property 2: Hard bounce immediate suppression
 * - Property 3: Soft bounce threshold suppression
 * - Property 4: Bounce data extraction completeness
 * - Property 13: Soft bounce count accuracy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    messageBounce: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    messageSuppressionList: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    messageDeliveryLog: {
      count: vi.fn(),
    },
    messageComplaint: {
      count: vi.fn(),
    },
  },
}));

// Mock suppression manager
vi.mock('@/lib/messaging/suppression-manager', () => ({
  addToSuppressionList: vi.fn(),
  getSuppressionDetails: vi.fn(),
  incrementSoftBounceCount: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { processBounce, getBounceHistory, getSoftBounceCount } from '@/lib/messaging/bounce-processor';
import { addToSuppressionList, getSuppressionDetails, incrementSoftBounceCount } from '@/lib/messaging/suppression-manager';

const mockPrisma = prisma as any;

// Test utilities
const createBounceNotification = (
  email: string,
  bounceType: 'Permanent' | 'Transient',
  bounceSubType: string = 'General'
) => ({
  bounceType,
  bounceSubType,
  bouncedRecipients: [
    {
      emailAddress: email,
      action: 'failed',
      status: '5.1.1',
      diagnosticCode: 'smtp; 550 5.1.1 user unknown',
    },
  ],
  timestamp: new Date().toISOString(),
  feedbackId: `feedback-${Date.now()}`,
});

const createMailInfo = (email: string) => ({
  timestamp: new Date().toISOString(),
  source: 'noreply@playroughrankings.com',
  messageId: `message-${Date.now()}`,
  destination: [email],
});

// Generators
const emailArbitrary = fc.emailAddress();

describe('Bounce Processor Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks (preserves structure, resets call history)
    vi.resetAllMocks();
    
    // Setup default mock implementations
    mockPrisma.messageBounce.create.mockResolvedValue({
      id: 'mock-bounce-id',
      recipient: 'test@example.com',
      channel: 'email',
      bounceType: 'Permanent',
      timestamp: new Date(),
    });
    
    mockPrisma.messageBounce.findMany.mockResolvedValue([]);
    mockPrisma.messageBounce.count.mockResolvedValue(0);
    
    // Mock rate calculator dependencies - ensure these are always set
    mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
    mockPrisma.messageComplaint.count.mockResolvedValue(0);
    
    (addToSuppressionList as any).mockResolvedValue(undefined);
    (getSuppressionDetails as any).mockResolvedValue(null);
    (incrementSoftBounceCount as any).mockResolvedValue(0);
  });

  describe('Property 2: Hard bounce immediate suppression', () => {
    it('**Feature: email-bounce-complaint-handling, Property 2: Hard bounce immediate suppression** **Validates: Requirements 3.1** - For any hard bounce notification, processing should immediately add the email to suppression list', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration (preserves structure)
          vi.resetAllMocks();
          
          // Setup mocks - ensure all required mocks are set
          mockPrisma.messageBounce.create.mockResolvedValue({});
          mockPrisma.messageBounce.count.mockResolvedValue(0);
          // Ensure messageDeliveryLog exists before accessing .count
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageComplaint) {
            mockPrisma.messageComplaint = { count: vi.fn() };
          }
          mockPrisma.messageComplaint.count.mockResolvedValue(0);
          
          // Create hard bounce notification
          const bounce = createBounceNotification(email, 'Permanent');
          const mail = createMailInfo(email);

          // Process the bounce
          await processBounce(bounce, mail);

          // Property: Hard bounce should trigger suppression
          expect(addToSuppressionList).toHaveBeenCalledWith({
            recipient: email.toLowerCase(),
            channel: 'email',
            reason: 'hard_bounce',
            suppressionType: 'bounce',
          });
          
          // Verify bounce was logged
          expect(mockPrisma.messageBounce.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              recipient: email.toLowerCase(),
              channel: 'email',
              bounceType: 'Permanent',
            }),
          });
        }),
        { numRuns: 100 } // Increased runs since it's fast now
      );
    });
  });

  describe('Property 3: Soft bounce threshold suppression', () => {
    it('**Feature: email-bounce-complaint-handling, Property 3: Soft bounce threshold suppression** **Validates: Requirements 3.3, 11.2** - For any email, 3 soft bounces within 30 days should trigger suppression', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration
          vi.resetAllMocks();
          
          // Setup mocks - count increases with each bounce
          let bounceCount = 0;
          mockPrisma.messageBounce.create.mockResolvedValue({});
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageComplaint) {
            mockPrisma.messageComplaint = { count: vi.fn() };
          }
          mockPrisma.messageComplaint.count.mockResolvedValue(0);
          (incrementSoftBounceCount as any).mockImplementation(() => {
            bounceCount++;
            return Promise.resolve(bounceCount);
          });
          
          // Create soft bounce notification
          const bounce = createBounceNotification(email, 'Transient');
          const mail = createMailInfo(email);

          // Process 3 soft bounces
          await processBounce(bounce, mail);
          await processBounce(bounce, mail);
          await processBounce(bounce, mail);

          // Property: 3 soft bounces should trigger suppression
          expect(addToSuppressionList).toHaveBeenCalledWith({
            recipient: email.toLowerCase(),
            channel: 'email',
            reason: 'soft_bounce_threshold',
            suppressionType: 'bounce',
          });
          
          // Verify all 3 bounces were logged
          expect(mockPrisma.messageBounce.create).toHaveBeenCalledTimes(3);
        }),
        { numRuns: 100 }
      );
    });

    it('should NOT suppress after only 2 soft bounces', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration
          vi.resetAllMocks();
          
          // Setup mocks - count increases with each bounce
          let bounceCount = 0;
          mockPrisma.messageBounce.create.mockResolvedValue({});
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageComplaint) {
            mockPrisma.messageComplaint = { count: vi.fn() };
          }
          mockPrisma.messageComplaint.count.mockResolvedValue(0);
          (incrementSoftBounceCount as any).mockImplementation(() => {
            bounceCount++;
            return Promise.resolve(bounceCount);
          });
          
          // Create soft bounce notification
          const bounce = createBounceNotification(email, 'Transient');
          const mail = createMailInfo(email);

          // Process only 2 soft bounces
          await processBounce(bounce, mail);
          await processBounce(bounce, mail);

          // Property: 2 soft bounces should NOT trigger suppression
          expect(addToSuppressionList).not.toHaveBeenCalled();
          
          // Verify both bounces were logged
          expect(mockPrisma.messageBounce.create).toHaveBeenCalledTimes(2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Bounce data extraction completeness', () => {
    it('**Feature: email-bounce-complaint-handling, Property 4: Bounce data extraction completeness** **Validates: Requirements 3.4, 3.5** - For any bounce notification, all required fields should be extracted and stored', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          fc.constantFrom('Permanent', 'Transient'),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (email, bounceType, bounceSubType) => {
            // Reset mocks for this iteration
            vi.resetAllMocks();
            
            // Setup mocks - ensure all required mocks are set
            mockPrisma.messageBounce.create.mockResolvedValue({});
            mockPrisma.messageBounce.count.mockResolvedValue(0);
            if (!mockPrisma.messageDeliveryLog) {
              mockPrisma.messageDeliveryLog = { count: vi.fn() };
            }
            mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
            if (!mockPrisma.messageComplaint) {
              mockPrisma.messageComplaint = { count: vi.fn() };
            }
            mockPrisma.messageComplaint.count.mockResolvedValue(0);
            
            // Create bounce notification with specific data
            const bounce = {
              bounceType,
              bounceSubType,
              bouncedRecipients: [
                {
                  emailAddress: email,
                  action: 'failed',
                  status: '5.1.1',
                  diagnosticCode: 'smtp; 550 5.1.1 user unknown',
                },
              ],
              timestamp: new Date().toISOString(),
              feedbackId: `feedback-${Date.now()}-${Math.random()}`,
            };
            const mail = {
              timestamp: new Date().toISOString(),
              source: 'noreply@playroughrankings.com',
              messageId: `message-${Date.now()}-${Math.random()}`,
              destination: [email],
            };

            // Process the bounce
            await processBounce(bounce, mail);

            // Property: All required fields should be extracted and stored
            expect(mockPrisma.messageBounce.create).toHaveBeenCalledWith({
              data: expect.objectContaining({
                recipient: email.toLowerCase(),
                channel: 'email',
                bounceType: bounceType,
                bounceSubType: bounceSubType,
                diagnosticCode: 'smtp; 550 5.1.1 user unknown',
                action: 'failed',
                status: '5.1.1',
                feedbackId: bounce.feedbackId,
                messageId: mail.messageId,
                timestamp: expect.any(Date),
              }),
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Soft bounce count accuracy', () => {
    it('**Feature: email-bounce-complaint-handling, Property 13: Soft bounce count accuracy** **Validates: Requirements 11.1, 11.4** - For any email, soft bounce count should equal number of soft bounces in 30-day window', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          fc.integer({ min: 0, max: 5 }),
          async (email, numBounces) => {
            // Reset mocks for this iteration
            vi.resetAllMocks();
            
            // Setup mocks - count returns the expected number
            mockPrisma.messageBounce.create.mockResolvedValue({});
            mockPrisma.messageBounce.count.mockResolvedValue(numBounces);
            if (!mockPrisma.messageDeliveryLog) {
              mockPrisma.messageDeliveryLog = { count: vi.fn() };
            }
            mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
            if (!mockPrisma.messageComplaint) {
              mockPrisma.messageComplaint = { count: vi.fn() };
            }
            mockPrisma.messageComplaint.count.mockResolvedValue(0);
            
            // Create soft bounce notification
            const bounce = createBounceNotification(email, 'Transient');
            const mail = createMailInfo(email);

            // Process specified number of soft bounces
            for (let i = 0; i < numBounces; i++) {
              await processBounce(bounce, mail);
            }

            // Get soft bounce count
            const count = await getSoftBounceCount(email, 'email');

            // Property: Count should equal number of bounces processed
            expect(count).toBe(numBounces);
            
            // Verify count query was called with correct parameters
            expect(mockPrisma.messageBounce.count).toHaveBeenCalledWith({
              where: {
                recipient: email.toLowerCase(),
                channel: 'email',
                bounceType: 'Transient',
                timestamp: {
                  gte: expect.any(Date),
                },
              },
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only count soft bounces within 30-day window', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration
          vi.resetAllMocks();
          
          // Setup mocks - count returns 0 for old bounces
          mockPrisma.messageBounce.count.mockResolvedValue(0);
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageComplaint) {
            mockPrisma.messageComplaint = { count: vi.fn() };
          }
          mockPrisma.messageComplaint.count.mockResolvedValue(0);
          
          // Get soft bounce count
          const count = await getSoftBounceCount(email, 'email');

          // Property: Old bounces should not be counted
          expect(count).toBe(0);
          
          // Verify count query includes 30-day window filter
          expect(mockPrisma.messageBounce.count).toHaveBeenCalledWith({
            where: {
              recipient: email.toLowerCase(),
              channel: 'email',
              bounceType: 'Transient',
              timestamp: {
                gte: expect.any(Date),
              },
            },
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
