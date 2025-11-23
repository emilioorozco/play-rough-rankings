/**
 * Property-Based Tests for Complaint Processor
 * 
 * Feature: email-bounce-complaint-handling
 * 
 * These tests verify correctness properties for complaint processing:
 * - Property 5: Complaint immediate suppression
 * - Property 24: Complaint suppression permanence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    messageComplaint: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    messageSuppressionList: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    messageDeliveryLog: {
      count: vi.fn(),
    },
    messageBounce: {
      count: vi.fn(),
    },
  },
}));

const { prisma } = await import('@/lib/prisma');
const { processComplaint, getComplaintHistory } = await import('@/lib/messaging/complaint-processor');
const { getSuppressionDetails, removeFromSuppressionList } = await import('@/lib/messaging/suppression-manager');

const mockPrisma = prisma as any;

// Test utilities
const createComplaintNotification = (
  email: string,
  complaintFeedbackType?: string
) => ({
  complainedRecipients: [
    {
      emailAddress: email,
    },
  ],
  timestamp: new Date().toISOString(),
  feedbackId: `feedback-${Date.now()}-${Math.random()}`,
  userAgent: 'Mozilla/5.0',
  complaintFeedbackType: complaintFeedbackType || 'abuse',
});

const createMailInfo = (email: string) => ({
  timestamp: new Date().toISOString(),
  source: 'noreply@playroughrankings.com',
  messageId: `message-${Date.now()}-${Math.random()}`,
  destination: [email],
});

// Generators
const emailArbitrary = fc.emailAddress();
const complaintTypeArbitrary = fc.constantFrom('abuse', 'fraud', 'virus', 'other', undefined);

describe('Complaint Processor Property Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test (preserves structure)
    vi.resetAllMocks();
    
    // Ensure rate calculator dependencies are always set
    if (!mockPrisma.messageDeliveryLog) {
      mockPrisma.messageDeliveryLog = { count: vi.fn() };
    }
    mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
    if (!mockPrisma.messageBounce) {
      mockPrisma.messageBounce = { count: vi.fn() };
    }
    mockPrisma.messageBounce.count.mockResolvedValue(0);
  });

  describe('Property 5: Complaint immediate suppression', () => {
    it('**Feature: email-bounce-complaint-handling, Property 5: Complaint immediate suppression** **Validates: Requirements 4.1, 4.4** - For any complaint notification, processing should immediately add the email to suppression list', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, complaintTypeArbitrary, async (email, complaintType) => {
          // Setup mocks for this iteration
          mockPrisma.messageComplaint.create.mockResolvedValue({
            id: 'test-id',
            recipient: email.toLowerCase(),
            channel: 'email',
            complaintType: complaintType || 'abuse',
          });
          
          mockPrisma.messageSuppressionList.upsert.mockResolvedValue({
            id: 'suppression-id',
            recipient: email.toLowerCase(),
            channel: 'email',
            reason: 'complaint',
            suppressionType: 'complaint',
          });
          
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageBounce) {
            mockPrisma.messageBounce = { count: vi.fn() };
          }
          mockPrisma.messageBounce.count.mockResolvedValue(0);

          // Create complaint notification
          const complaint = createComplaintNotification(email, complaintType);
          const mail = createMailInfo(email);

          // Process the complaint
          await processComplaint(complaint, mail);

          // Property: Complaint should result in immediate suppression
          // Verify that complaint was logged
          expect(mockPrisma.messageComplaint.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                recipient: email.toLowerCase(),
                channel: 'email',
                complaintType: complaintType || 'abuse',
              }),
            })
          );

          // Verify that email was added to suppression list
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              where: {
                recipient_channel: {
                  recipient: email.toLowerCase(),
                  channel: 'email',
                },
              },
              create: expect.objectContaining({
                recipient: email.toLowerCase(),
                channel: 'email',
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
            })
          );
        }),
        { numRuns: 100 } // Can run many more iterations now that we're not hitting the DB
      );
    });

    it('should log complaint with all extracted data', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, complaintTypeArbitrary, async (email, complaintType) => {
          // Setup mocks
          const mockComplaint = {
            id: 'test-id',
            recipient: email.toLowerCase(),
            channel: 'email',
            complaintType: complaintType || 'abuse',
            userAgent: 'Mozilla/5.0',
            feedbackId: `feedback-${Date.now()}`,
            messageId: `message-${Date.now()}`,
            timestamp: new Date(),
          };
          
          mockPrisma.messageComplaint.create.mockResolvedValue(mockComplaint);
          mockPrisma.messageSuppressionList.upsert.mockResolvedValue({});
          
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageBounce) {
            mockPrisma.messageBounce = { count: vi.fn() };
          }
          mockPrisma.messageBounce.count.mockResolvedValue(0);

          // Create complaint notification
          const complaint = createComplaintNotification(email, complaintType);
          const mail = createMailInfo(email);

          // Process the complaint
          await processComplaint(complaint, mail);

          // Property: Complaint should be logged with all required fields
          expect(mockPrisma.messageComplaint.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                recipient: email.toLowerCase(),
                channel: 'email',
                complaintType: complaintType || 'abuse',
                userAgent: 'Mozilla/5.0',
                feedbackId: complaint.feedbackId,
                messageId: mail.messageId,
                timestamp: expect.any(Date),
              }),
            })
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: Complaint suppression permanence', () => {
    it('**Feature: email-bounce-complaint-handling, Property 24: Complaint suppression permanence** **Validates: Requirements 4.5** - For any email suppressed due to complaint, the suppression should persist and not be overwritten by subsequent operations', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration
          vi.resetAllMocks();
          
          // Setup mocks - suppression persists across multiple complaints
          const suppressionRecord = {
            id: 'suppression-id',
            recipient: email.toLowerCase(),
            channel: 'email',
            reason: 'complaint',
            suppressionType: 'complaint',
          };
          
          mockPrisma.messageComplaint.create.mockResolvedValue({});
          mockPrisma.messageSuppressionList.upsert.mockResolvedValue(suppressionRecord);
          
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageBounce) {
            mockPrisma.messageBounce = { count: vi.fn() };
          }
          mockPrisma.messageBounce.count.mockResolvedValue(0);

          // Create and process initial complaint
          const complaint1 = createComplaintNotification(email, 'abuse');
          const mail1 = createMailInfo(email);
          await processComplaint(complaint1, mail1);

          // Verify upsert was called for first complaint
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledTimes(1);
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
              create: expect.objectContaining({
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
              update: expect.objectContaining({
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
            })
          );

          // Process another complaint for the same email
          const complaint2 = createComplaintNotification(email, 'fraud');
          const mail2 = createMailInfo(email);
          await processComplaint(complaint2, mail2);

          // Property: Suppression should be updated with same reason/type (permanence)
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledTimes(2);
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenLastCalledWith(
            expect.objectContaining({
              create: expect.objectContaining({
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
              update: expect.objectContaining({
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
            })
          );

          // Verify both complaints were logged
          expect(mockPrisma.messageComplaint.create).toHaveBeenCalledTimes(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain complaint suppression even after manual removal and re-complaint', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitrary, async (email) => {
          // Reset mocks for this iteration
          vi.resetAllMocks();
          
          // Setup mocks
          mockPrisma.messageComplaint.create.mockResolvedValue({});
          mockPrisma.messageSuppressionList.upsert.mockResolvedValue({});
          mockPrisma.messageSuppressionList.delete.mockResolvedValue({});
          
          // Ensure rate calculator dependencies are set
          if (!mockPrisma.messageDeliveryLog) {
            mockPrisma.messageDeliveryLog = { count: vi.fn() };
          }
          mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
          if (!mockPrisma.messageBounce) {
            mockPrisma.messageBounce = { count: vi.fn() };
          }
          mockPrisma.messageBounce.count.mockResolvedValue(0);

          // Create and process initial complaint
          const complaint1 = createComplaintNotification(email, 'abuse');
          const mail1 = createMailInfo(email);
          await processComplaint(complaint1, mail1);

          // Verify suppression was created
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledTimes(1);

          // Manually remove from suppression list (admin action)
          await removeFromSuppressionList(email, 'email');

          // Verify deletion was called
          expect(mockPrisma.messageSuppressionList.delete).toHaveBeenCalledWith({
            where: {
              recipient_channel: {
                recipient: email.toLowerCase(),
                channel: 'email',
              },
            },
          });

          // Process another complaint
          const complaint2 = createComplaintNotification(email, 'fraud');
          const mail2 = createMailInfo(email);
          await processComplaint(complaint2, mail2);

          // Property: Suppression should be re-established
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledTimes(2);
          expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenLastCalledWith(
            expect.objectContaining({
              create: expect.objectContaining({
                reason: 'complaint',
                suppressionType: 'complaint',
              }),
            })
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple complaints for the same email without errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          fc.integer({ min: 1, max: 5 }),
          async (email, numComplaints) => {
            // Reset mocks for this iteration
            vi.resetAllMocks();
            
            // Setup mocks
            mockPrisma.messageComplaint.create.mockResolvedValue({});
            mockPrisma.messageSuppressionList.upsert.mockResolvedValue({});
            
            // Ensure rate calculator dependencies are set
            if (!mockPrisma.messageDeliveryLog) {
              mockPrisma.messageDeliveryLog = { count: vi.fn() };
            }
            mockPrisma.messageDeliveryLog.count.mockResolvedValue(0);
            if (!mockPrisma.messageBounce) {
              mockPrisma.messageBounce = { count: vi.fn() };
            }
            mockPrisma.messageBounce.count.mockResolvedValue(0);

            // Process multiple complaints
            for (let i = 0; i < numComplaints; i++) {
              const complaint = createComplaintNotification(email, 'abuse');
              const mail = createMailInfo(email);
              await processComplaint(complaint, mail);
            }

            // Property: All complaints should be logged
            expect(mockPrisma.messageComplaint.create).toHaveBeenCalledTimes(numComplaints);
            
            // Property: Suppression should be upserted for each complaint
            expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenCalledTimes(numComplaints);
            
            // Property: All upserts should maintain complaint reason
            for (let i = 0; i < numComplaints; i++) {
              expect(mockPrisma.messageSuppressionList.upsert).toHaveBeenNthCalledWith(
                i + 1,
                expect.objectContaining({
                  create: expect.objectContaining({
                    reason: 'complaint',
                    suppressionType: 'complaint',
                  }),
                })
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
