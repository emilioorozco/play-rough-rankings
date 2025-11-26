/**
 * Integration Tests for Resend Webhook Endpoint
 * 
 * Tests Resend bounce and complaint notification processing,
 * signature verification, and error handling.
 * 
 * Resend uses Svix for webhook delivery and signature verification.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/email/resend-webhook/route';
import { NextRequest } from 'next/server';
import {
  clearTestData,
  getTestBounces,
  getTestComplaints,
  getTestSuppression,
} from './test-utils';

// Mock Svix Webhook to avoid actual signature verification in tests
vi.mock('svix', () => {
  class MockWebhook {
    verify(body: string, headers: Record<string, string>) {
      // In tests, we'll accept all signatures
      // In production, this would verify the signature
      return JSON.parse(body);
    }
  }
  return {
    Webhook: MockWebhook,
  };
});

describe('Resend Webhook Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await clearTestData();
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Set webhook secret for signature verification
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  /**
   * Create a mock Resend bounce event
   */
  function createMockResendBounceEvent(overrides: {
    email?: string;
    emailId?: string;
    timestamp?: string;
  } = {}) {
    const email = overrides.email || 'bounce@example.com';
    const emailId = overrides.emailId || `email-${Date.now()}`;
    const timestamp = overrides.timestamp || new Date().toISOString();

    return {
      type: 'email.bounced',
      created_at: timestamp,
      data: {
        created_at: timestamp,
        email_id: emailId,
        from: 'noreply@example.com',
        to: [email],
        subject: 'Test Email',
      },
    };
  }

  /**
   * Create a mock Resend complaint event
   */
  function createMockResendComplaintEvent(overrides: {
    email?: string;
    emailId?: string;
    timestamp?: string;
  } = {}) {
    const email = overrides.email || 'complaint@example.com';
    const emailId = overrides.emailId || `email-${Date.now()}`;
    const timestamp = overrides.timestamp || new Date().toISOString();

    return {
      type: 'email.complained',
      created_at: timestamp,
      data: {
        created_at: timestamp,
        email_id: emailId,
        from: 'noreply@example.com',
        to: [email],
        subject: 'Test Email',
      },
    };
  }

  /**
   * Create a mock Resend webhook request with Svix headers
   */
  function createMockResendRequest(event: any) {
    const body = JSON.stringify(event);
    return new NextRequest('http://localhost:3000/api/email/resend-webhook', {
      method: 'POST',
      body,
      headers: {
        'svix-id': `svix-${Date.now()}`,
        'svix-timestamp': new Date().toISOString(),
        'svix-signature': 'mock-signature',
      },
    });
  }

  describe('Bounce Event Processing', () => {
    it('should process bounce event and log to database', async () => {
      // Arrange
      const email = 'bounce@example.com';
      const bounceEvent = createMockResendBounceEvent({ email });
      const request = createMockResendRequest(bounceEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Bounce processed');

      // Verify bounce was logged
      const bounces = await getTestBounces(email);
      expect(bounces).toHaveLength(1);
      expect(bounces[0].bounceType).toBe('Permanent'); // Resend defaults to Permanent

      // Verify email was suppressed
      const suppression = await getTestSuppression(email);
      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe('hard_bounce');
    });

    it('should handle bounce event with array of recipients', async () => {
      // Arrange
      const email = 'bounce-array@example.com';
      const bounceEvent = createMockResendBounceEvent({ email });
      // Ensure to is an array
      bounceEvent.data.to = [email, 'another@example.com'];
      const request = createMockResendRequest(bounceEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Bounce processed');

      // Verify bounce was logged for first recipient
      const bounces = await getTestBounces(email);
      expect(bounces).toHaveLength(1);
    });

    it('should handle bounce event with string recipient', async () => {
      // Arrange
      const email = 'bounce-string@example.com';
      const bounceEvent = createMockResendBounceEvent({ email });
      // Set to as string instead of array
      bounceEvent.data.to = email;
      const request = createMockResendRequest(bounceEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Bounce processed');

      // Verify bounce was logged
      const bounces = await getTestBounces(email);
      expect(bounces).toHaveLength(1);
    });
  });

  describe('Complaint Event Processing', () => {
    it('should process complaint event and log to database', async () => {
      // Arrange
      const email = 'complaint@example.com';
      const complaintEvent = createMockResendComplaintEvent({ email });
      const request = createMockResendRequest(complaintEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Complaint processed');

      // Verify complaint was logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
      expect(complaints[0].complaintType).toBe('abuse');

      // Verify email was suppressed immediately
      const suppression = await getTestSuppression(email);
      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe('complaint');
    });

    it('should handle complaint event with array of recipients', async () => {
      // Arrange
      const email = 'complaint-array@example.com';
      const complaintEvent = createMockResendComplaintEvent({ email });
      complaintEvent.data.to = [email, 'another@example.com'];
      const request = createMockResendRequest(complaintEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Complaint processed');

      // Verify complaint was logged
      const complaints = await getTestComplaints(email);
      expect(complaints).toHaveLength(1);
    });
  });

  describe('Signature Verification', () => {
    it('should accept valid Svix signature', async () => {
      // Arrange
      const bounceEvent = createMockResendBounceEvent();
      const request = createMockResendRequest(bounceEvent);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should reject request with missing signature headers', async () => {
      // Arrange
      const bounceEvent = createMockResendBounceEvent();
      const request = new NextRequest('http://localhost:3000/api/email/resend-webhook', {
        method: 'POST',
        body: JSON.stringify(bounceEvent),
        // Missing Svix headers
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('Missing signature headers');
    });

    it('should work without signature verification when secret not configured', async () => {
      // Arrange
      delete process.env.RESEND_WEBHOOK_SECRET;
      const bounceEvent = createMockResendBounceEvent();
      const request = new NextRequest('http://localhost:3000/api/email/resend-webhook', {
        method: 'POST',
        body: JSON.stringify(bounceEvent),
        // No headers needed when secret not configured
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Bounce processed');
    });
  });

  describe('Other Event Types', () => {
    it('should log but not process delivered events', async () => {
      // Arrange
      const deliveredEvent = {
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email-123',
          to: ['delivered@example.com'],
        },
      };
      const request = createMockResendRequest(deliveredEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Event received');
    });

    it('should log but not process delivery_delayed events', async () => {
      // Arrange
      const delayedEvent = {
        type: 'email.delivery_delayed',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email-123',
          to: ['delayed@example.com'],
        },
      };
      const request = createMockResendRequest(delayedEvent);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Event received');
    });
  });

  describe('Error Handling', () => {
    it('should return 403 for invalid JSON when signature verification fails', async () => {
      // Arrange - Invalid JSON will cause signature verification to fail
      const request = new NextRequest('http://localhost:3000/api/email/resend-webhook', {
        method: 'POST',
        body: 'invalid json {',
        headers: {
          'svix-id': 'test',
          'svix-timestamp': new Date().toISOString(),
          'svix-signature': 'test',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert - Signature verification fails before JSON parsing
      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid signature');
    });

    it('should return 500 for processing errors', async () => {
      // Arrange - Mock processBounce to throw error
      const bounceEvent = createMockResendBounceEvent();
      const request = createMockResendRequest(bounceEvent);
      
      // Mock processBounce to throw error
      // We need to import and spy before the POST call
      const bounceProcessorModule = await import('@/lib/messaging/bounce-processor');
      const processBounceSpy = vi.spyOn(bounceProcessorModule, 'processBounce');
      processBounceSpy.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
      
      // Cleanup
      processBounceSpy.mockRestore();
    });
  });

  describe('HTTPS Enforcement', () => {
    it('should accept HTTPS requests in production', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const bounceEvent = createMockResendBounceEvent();
      const request = new NextRequest('http://localhost:3000/api/email/resend-webhook', {
        method: 'POST',
        body: JSON.stringify(bounceEvent),
        headers: {
          'x-forwarded-proto': 'https',
          'svix-id': 'test',
          'svix-timestamp': new Date().toISOString(),
          'svix-signature': 'test',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      
      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should reject HTTP requests in production', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const bounceEvent = createMockResendBounceEvent();
      const request = new NextRequest('http://localhost:3000/api/email/resend-webhook', {
        method: 'POST',
        body: JSON.stringify(bounceEvent),
        headers: {
          'x-forwarded-proto': 'http',
          'svix-id': 'test',
          'svix-timestamp': new Date().toISOString(),
          'svix-signature': 'test',
        },
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('HTTPS required');
      
      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});

