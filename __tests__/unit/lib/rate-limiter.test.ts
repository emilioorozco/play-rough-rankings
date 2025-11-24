/**
 * Rate Limiter Tests
 * 
 * Tests for the email rate limiting system to ensure proper
 * rate limit enforcement and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  getRateLimitStatus,
  cleanupExpiredEntries,
  RateLimitError,
  RATE_LIMITS,
  type EmailType,
} from '@/lib/email/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  afterEach(() => {
    // Clean up after each test
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Should not throw for first 3 attempts
      expect(() => checkRateLimit(email, emailType)).not.toThrow();
      expect(() => checkRateLimit(email, emailType)).not.toThrow();
      expect(() => checkRateLimit(email, emailType)).not.toThrow();
    });

    it('should throw RateLimitError when limit exceeded', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up all attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      // Fourth attempt should throw
      expect(() => checkRateLimit(email, emailType)).toThrow(RateLimitError);
    });

    it('should include retry-after timestamp in error', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up all attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      // Fourth attempt should throw with retry-after
      try {
        checkRateLimit(email, emailType);
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        if (error instanceof RateLimitError) {
          expect(error.retryAfter).toBeInstanceOf(Date);
          expect(error.retryAfter.getTime()).toBeGreaterThan(Date.now());
          expect(error.emailType).toBe(emailType);
          expect(error.identifier).toBe(email);
        }
      }
    });

    it('should track different email types separately', () => {
      const email = 'test@example.com';
      
      // Use up verification limit
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      
      // Password reset should still work
      expect(() => checkRateLimit(email, 'password_reset')).not.toThrow();
      expect(() => checkRateLimit(email, 'password_reset')).not.toThrow();
      expect(() => checkRateLimit(email, 'password_reset')).not.toThrow();
    });

    it('should track different emails separately', () => {
      const email1 = 'test1@example.com';
      const email2 = 'test2@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up limit for email1
      checkRateLimit(email1, emailType);
      checkRateLimit(email1, emailType);
      checkRateLimit(email1, emailType);
      
      // email2 should still work
      expect(() => checkRateLimit(email2, emailType)).not.toThrow();
      expect(() => checkRateLimit(email2, emailType)).not.toThrow();
      expect(() => checkRateLimit(email2, emailType)).not.toThrow();
    });

    it('should be case-insensitive for email addresses', () => {
      const emailType: EmailType = 'verification';
      
      // Use up limit with lowercase
      checkRateLimit('test@example.com', emailType);
      checkRateLimit('test@example.com', emailType);
      checkRateLimit('test@example.com', emailType);
      
      // Uppercase should also be limited
      expect(() => checkRateLimit('TEST@EXAMPLE.COM', emailType)).toThrow(RateLimitError);
    });

    it('should respect different rate limits for different email types', () => {
      const email = 'test@example.com';
      
      // Verification: 3 attempts
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      expect(() => checkRateLimit(email, 'verification')).toThrow(RateLimitError);
      
      // Role invitation: 5 attempts (using different email to avoid conflict)
      const adminEmail = 'admin@example.com';
      checkRateLimit(adminEmail, 'role_invitation');
      checkRateLimit(adminEmail, 'role_invitation');
      checkRateLimit(adminEmail, 'role_invitation');
      checkRateLimit(adminEmail, 'role_invitation');
      checkRateLimit(adminEmail, 'role_invitation');
      expect(() => checkRateLimit(adminEmail, 'role_invitation')).toThrow(RateLimitError);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific email and type', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up all attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      // Should be limited
      expect(() => checkRateLimit(email, emailType)).toThrow(RateLimitError);
      
      // Reset limit
      resetRateLimit(email, emailType);
      
      // Should work again
      expect(() => checkRateLimit(email, emailType)).not.toThrow();
    });

    it('should only reset specific email type', () => {
      const email = 'test@example.com';
      
      // Use up both limits
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      checkRateLimit(email, 'verification');
      
      checkRateLimit(email, 'password_reset');
      checkRateLimit(email, 'password_reset');
      checkRateLimit(email, 'password_reset');
      
      // Reset only verification
      resetRateLimit(email, 'verification');
      
      // Verification should work
      expect(() => checkRateLimit(email, 'verification')).not.toThrow();
      
      // Password reset should still be limited
      expect(() => checkRateLimit(email, 'password_reset')).toThrow(RateLimitError);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const email1 = 'test1@example.com';
      const email2 = 'test2@example.com';
      
      // Use up limits for multiple emails and types
      checkRateLimit(email1, 'verification');
      checkRateLimit(email1, 'verification');
      checkRateLimit(email1, 'verification');
      
      checkRateLimit(email2, 'password_reset');
      checkRateLimit(email2, 'password_reset');
      checkRateLimit(email2, 'password_reset');
      
      // Clear all
      clearAllRateLimits();
      
      // All should work again
      expect(() => checkRateLimit(email1, 'verification')).not.toThrow();
      expect(() => checkRateLimit(email2, 'password_reset')).not.toThrow();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status for unused limit', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      const status = getRateLimitStatus(email, emailType);
      
      expect(status).not.toBeNull();
      expect(status?.attemptsRemaining).toBe(RATE_LIMITS[emailType].maxAttempts);
      expect(status?.isLimited).toBe(false);
      expect(status?.resetsAt).toBeInstanceOf(Date);
    });

    it('should return correct status after some attempts', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use 2 attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      const status = getRateLimitStatus(email, emailType);
      
      expect(status).not.toBeNull();
      expect(status?.attemptsRemaining).toBe(1);
      expect(status?.isLimited).toBe(false);
    });

    it('should return correct status when limited', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up all attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      const status = getRateLimitStatus(email, emailType);
      
      expect(status).not.toBeNull();
      expect(status?.attemptsRemaining).toBe(0);
      expect(status?.isLimited).toBe(true);
      expect(status?.resetsAt).toBeInstanceOf(Date);
      expect(status?.resetsAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not modify rate limit counters', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Check status multiple times
      getRateLimitStatus(email, emailType);
      getRateLimitStatus(email, emailType);
      getRateLimitStatus(email, emailType);
      
      // Should still have all attempts available
      const status = getRateLimitStatus(email, emailType);
      expect(status?.attemptsRemaining).toBe(RATE_LIMITS[emailType].maxAttempts);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use up limit
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      // Should be limited
      expect(() => checkRateLimit(email, emailType)).toThrow(RateLimitError);
      
      // Mock time passing (1 hour + 1 minute)
      const originalNow = Date.now;
      const futureTime = Date.now() + (61 * 60 * 1000);
      vi.spyOn(Date, 'now').mockReturnValue(futureTime);
      
      // Cleanup expired entries
      cleanupExpiredEntries();
      
      // Should work again after cleanup
      expect(() => checkRateLimit(email, emailType)).not.toThrow();
      
      // Restore original Date.now
      vi.spyOn(Date, 'now').mockRestore();
    });

    it('should not remove non-expired entries', () => {
      const email = 'test@example.com';
      const emailType: EmailType = 'verification';
      
      // Use 2 attempts
      checkRateLimit(email, emailType);
      checkRateLimit(email, emailType);
      
      // Cleanup (nothing should be removed)
      cleanupExpiredEntries();
      
      // Should still have 1 attempt remaining
      const status = getRateLimitStatus(email, emailType);
      expect(status?.attemptsRemaining).toBe(1);
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have correct configuration for verification emails', () => {
      expect(RATE_LIMITS.verification.maxAttempts).toBe(3);
      expect(RATE_LIMITS.verification.windowDuration).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should have correct configuration for password reset emails', () => {
      expect(RATE_LIMITS.password_reset.maxAttempts).toBe(3);
      expect(RATE_LIMITS.password_reset.windowDuration).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should have correct configuration for role invitation emails', () => {
      expect(RATE_LIMITS.role_invitation.maxAttempts).toBe(5);
      expect(RATE_LIMITS.role_invitation.windowDuration).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('RateLimitError', () => {
    it('should have correct properties', () => {
      const retryAfter = new Date(Date.now() + 60000);
      const emailType: EmailType = 'verification';
      const identifier = 'test@example.com';
      const message = 'Rate limit exceeded';
      
      const error = new RateLimitError(message, retryAfter, emailType, identifier);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe(message);
      expect(error.retryAfter).toBe(retryAfter);
      expect(error.emailType).toBe(emailType);
      expect(error.identifier).toBe(identifier);
    });
  });
});
