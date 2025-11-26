/**
 * Unit Tests for Complaint Processor
 * 
 * Tests complaint processing, immediate suppression, and complaint logging functionality.
 * 
 * Requirements: 4.1, 4.3
 * 
 * NOTE: DISABLED - These integration tests are failing after migration to Resend.
 * The core complaint processor functionality is still used by Resend webhooks,
 * but these tests need to be updated to work with the new provider setup.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { processComplaint, getComplaintHistory } from '@/lib/messaging/complaint-processor';
import { isRecipientSuppressed, getSuppressionDetails } from '@/lib/messaging/suppression-manager';
import {
  clearTestData,
  createMockComplaintNotification,
  getTestComplaints,
  getTestSuppression,
  generateUniqueEmail,
} from './test-utils';

// RE-ENABLED: Tests are passing after investigation
describe('Complaint Processor Unit Tests', () => {
  // Set up test isolation - cleans database before each test
  // Tests run sequentially to prevent interference
  beforeEach(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    // Final cleanup after all tests complete
    await clearTestData();
  });

  describe('Complaint Processing (Requirement 4.1)', () => {
    it('should process complaint and add to suppression list immediately', async () => {
      // Arrange
      const email = generateUniqueEmail('complaint');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'abuse',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check complaint was logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].complaintType).toBe('abuse');
      expect(complaints[0].recipient).toBe(email.toLowerCase());

      // Assert - Check email was added to suppression list immediately
      const isSuppressed = await isRecipientSuppressed(email, 'email');
      expect(isSuppressed).toBe(true);

      const details = await getSuppressionDetails(email, 'email');
      expect(details).not.toBeNull();
      expect(details?.reason).toBe('complaint');
      expect(details?.suppressionType).toBe('complaint');
    });

    it('should handle complaint with user agent information', async () => {
      // Arrange
      const email = generateUniqueEmail('useragent');
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const notification = createMockComplaintNotification({
        emailAddress: email,
        userAgent,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check user agent was stored
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].userAgent).toBe(userAgent);
    });

    it('should handle complaint with feedback type', async () => {
      // Arrange
      const email = generateUniqueEmail('feedbacktype');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'fraud',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check feedback type was stored
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].complaintType).toBe('fraud');
    });

    it('should handle complaint without optional fields', async () => {
      // Arrange
      const email = generateUniqueEmail('minimal');
      // Create notification with minimal fields (mock still provides defaults)
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });
      // Remove optional fields to test null handling
      // Use type assertion to allow undefined for testing
      (notification.complaint as any).complaintFeedbackType = undefined;
      (notification.complaint as any).userAgent = undefined;

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check complaint was still logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].recipient).toBe(email.toLowerCase());
      // Optional fields should be null when not provided
      expect(complaints[0].complaintType).toBeNull();
      expect(complaints[0].userAgent).toBeNull();
    });
  });

  describe('Immediate Suppression (Requirement 4.1)', () => {
    it('should suppress email immediately on first complaint', async () => {
      // Arrange
      const email = generateUniqueEmail('firstcomplaint');
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check immediate suppression
      const isSuppressed = await isRecipientSuppressed(email, 'email');
      expect(isSuppressed).toBe(true);

      const details = await getSuppressionDetails(email, 'email');
      expect(details).not.toBeNull();
      expect(details?.reason).toBe('complaint');
      expect(details?.suppressionType).toBe('complaint');
    });

    it('should maintain suppression on subsequent complaints', async () => {
      // Arrange
      const email = generateUniqueEmail('multiplecomplaint');
      const notification1 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-1',
      });
      const notification2 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-2',
      });

      // Act - Process two complaints
      await processComplaint(notification1.complaint, notification1.mail);
      await processComplaint(notification2.complaint, notification2.mail);

      // Assert - Check still suppressed
      const isSuppressed = await isRecipientSuppressed(email, 'email');
      expect(isSuppressed).toBe(true);

      // Assert - Check both complaints were logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(2);
    });

    it('should use complaint suppression type', async () => {
      // Arrange
      const email = generateUniqueEmail('suppressiontype');
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check suppression type is complaint
      const details = await getSuppressionDetails(email, 'email');
      expect(details).not.toBeNull();
      expect(details?.suppressionType).toBe('complaint');
      expect(details?.reason).toBe('complaint');
    });
  });

  describe('Complaint Logging (Requirement 4.3)', () => {
    it('should log all complaint events with complete information', async () => {
      // Arrange
      const email = generateUniqueEmail('logging');
      const messageId = 'test-message-123';
      const feedbackId = 'test-feedback-456';
      const timestamp = new Date().toISOString();
      const userAgent = 'Mozilla/5.0';
      const complaintFeedbackType = 'abuse';
      
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType,
        userAgent,
        messageId,
        feedbackId,
        timestamp,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check all fields were logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      
      const complaint = complaints[0];
      expect(complaint.recipient).toBe(email.toLowerCase());
      expect(complaint.channel).toBe('email');
      expect(complaint.complaintType).toBe(complaintFeedbackType);
      expect(complaint.userAgent).toBe(userAgent);
      expect(complaint.messageId).toBe(messageId);
      expect(complaint.feedbackId).toBe(feedbackId);
      expect(complaint.timestamp).toBeInstanceOf(Date);
    });

    it('should handle multiple complaints for same email', async () => {
      // Arrange
      const email = generateUniqueEmail('multiplecomplaints');
      const notification1 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-1',
        complaintFeedbackType: 'abuse',
      });
      const notification2 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-2',
        complaintFeedbackType: 'fraud',
      });

      // Act
      await processComplaint(notification1.complaint, notification1.mail);
      await processComplaint(notification2.complaint, notification2.mail);

      // Assert - Check both complaints were logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(2);
      // getTestComplaints orders by timestamp desc, so check both are present
      const messageIds = complaints.map(c => c.messageId);
      expect(messageIds).toContain('msg-1');
      expect(messageIds).toContain('msg-2');
      const complaintTypes = complaints.map(c => c.complaintType);
      expect(complaintTypes).toContain('fraud');
      expect(complaintTypes).toContain('abuse');
    });

    it('should log complaint with channel information', async () => {
      // Arrange
      const email = generateUniqueEmail('channel');
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check channel was logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].channel).toBe('email');
    });
  });

  describe('Complaint History Retrieval', () => {
    it('should retrieve complaint history for a recipient', async () => {
      // Arrange
      const email = generateUniqueEmail('history');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'abuse',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);
      const history = await getComplaintHistory(email, 'email');

      // Assert
      expect(history).toHaveLength(1);
      expect(history[0].recipient).toBe(email.toLowerCase());
      expect(history[0].complaintType).toBe('abuse');
    });

    it('should return empty array for recipient with no complaints', async () => {
      // Act
      const history = await getComplaintHistory('nocomplaints@example.com', 'email');

      // Assert
      expect(history).toHaveLength(0);
    });

    it('should order complaint history by timestamp descending', async () => {
      // Arrange
      const email = generateUniqueEmail('orderedhistory');
      const notification1 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-1',
        timestamp: new Date(Date.now() - 1000).toISOString(),
      });
      const notification2 = createMockComplaintNotification({
        emailAddress: email,
        messageId: 'msg-2',
        timestamp: new Date().toISOString(),
      });

      // Act
      await processComplaint(notification1.complaint, notification1.mail);
      await processComplaint(notification2.complaint, notification2.mail);
      const history = await getComplaintHistory(email, 'email');

      // Assert - Most recent first
      expect(history).toHaveLength(2);
      expect(history[0].messageId).toBe('msg-2');
      expect(history[1].messageId).toBe('msg-1');
    });
  });

  describe('Email Normalization', () => {
    it('should normalize email addresses to lowercase', async () => {
      // Arrange
      const email = 'MixedCase@Example.COM';
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Check email was stored in lowercase
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].recipient).toBe(email.toLowerCase());

      // Assert - Check suppression uses lowercase
      const isSuppressed = await isRecipientSuppressed(email, 'email');
      expect(isSuppressed).toBe(true);
    });
  });

  describe('Zero Tolerance Policy', () => {
    it('should suppress on first complaint without threshold', async () => {
      // Arrange
      const email = generateUniqueEmail('zerotolerance');
      const notification = createMockComplaintNotification({
        emailAddress: email,
      });

      // Act - Process single complaint
      await processComplaint(notification.complaint, notification.mail);

      // Assert - Should be immediately suppressed (no threshold like bounces)
      const isSuppressed = await isRecipientSuppressed(email, 'email');
      expect(isSuppressed).toBe(true);

      const details = await getSuppressionDetails(email, 'email');
      expect(details).not.toBeNull();
      expect(details?.reason).toBe('complaint');
    });
  });

  describe('Complaint Feedback Types', () => {
    it('should handle abuse complaint type', async () => {
      // Arrange
      const email = generateUniqueEmail('abuse');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'abuse',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert
      const complaints = await getTestComplaints(email);
      expect(complaints[0].complaintType).toBe('abuse');
    });

    it('should handle fraud complaint type', async () => {
      // Arrange
      const email = generateUniqueEmail('fraud');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'fraud',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert
      const complaints = await getTestComplaints(email);
      expect(complaints[0].complaintType).toBe('fraud');
    });

    it('should handle virus complaint type', async () => {
      // Arrange
      const email = generateUniqueEmail('virus');
      const notification = createMockComplaintNotification({
        emailAddress: email,
        complaintFeedbackType: 'virus',
      });

      // Act
      await processComplaint(notification.complaint, notification.mail);

      // Assert
      const complaints = await getTestComplaints(email);
      expect(complaints[0].complaintType).toBe('virus');
    });
  });
});
