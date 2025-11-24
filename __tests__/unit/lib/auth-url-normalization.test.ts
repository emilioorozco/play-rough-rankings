/**
 * Unit tests for URL normalization in auth
 * 
 * Tests the normalizeAuthUrl function to ensure verification and password reset
 * links always use the correct domain from BETTER_AUTH_URL.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { normalizeAuthUrl } from '@/lib/auth'

describe('normalizeAuthUrl', () => {
  const originalEnv = process.env.BETTER_AUTH_URL

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.BETTER_AUTH_URL = originalEnv
    } else {
      delete process.env.BETTER_AUTH_URL
    }
  })

  describe('when BETTER_AUTH_URL is set', () => {
    it('should replace origin with BETTER_AUTH_URL origin', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const inputUrl = 'https://playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('https://www.playroughrankings.dev/verify-email?token=abc123')
    })

    it('should preserve pathname, search params, and hash', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const inputUrl = 'https://playroughrankings.dev/api/auth/verify-email?token=abc123&foo=bar#section'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('https://www.playroughrankings.dev/api/auth/verify-email?token=abc123&foo=bar#section')
    })

    it('should handle www to non-www normalization', () => {
      process.env.BETTER_AUTH_URL = 'https://playroughrankings.dev/'
      
      const inputUrl = 'https://www.playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('https://playroughrankings.dev/verify-email?token=abc123')
    })

    it('should handle non-www to www normalization', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const inputUrl = 'https://playroughrankings.dev/reset-password?token=xyz789'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('https://www.playroughrankings.dev/reset-password?token=xyz789')
    })

    it('should handle URLs with trailing slashes in BETTER_AUTH_URL', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const inputUrl = 'https://playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('https://www.playroughrankings.dev/verify-email?token=abc123')
    })

    it('should handle different protocols', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const inputUrl = 'http://playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      // Should use the protocol from BETTER_AUTH_URL
      expect(result).toBe('https://www.playroughrankings.dev/verify-email?token=abc123')
    })

    it('should handle localhost URLs', () => {
      process.env.BETTER_AUTH_URL = 'http://localhost:3000'
      
      const inputUrl = 'http://127.0.0.1:3000/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe('http://localhost:3000/verify-email?token=abc123')
    })
  })

  describe('when BETTER_AUTH_URL is not set', () => {
    it('should return the original URL unchanged', () => {
      delete process.env.BETTER_AUTH_URL
      
      const inputUrl = 'https://playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe(inputUrl)
    })
  })

  describe('error handling', () => {
    it('should return original URL if input URL is invalid', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const invalidUrl = 'not-a-valid-url'
      const result = normalizeAuthUrl(invalidUrl)
      
      expect(result).toBe(invalidUrl)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to normalize URL'),
        expect.anything()
      )
      
      consoleSpy.mockRestore()
    })

    it('should return original URL if BETTER_AUTH_URL is invalid', () => {
      process.env.BETTER_AUTH_URL = 'not-a-valid-url'
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const inputUrl = 'https://playroughrankings.dev/verify-email?token=abc123'
      const result = normalizeAuthUrl(inputUrl)
      
      expect(result).toBe(inputUrl)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to normalize URL'),
        expect.anything()
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('real-world scenarios', () => {
    it('should normalize verification email URLs', () => {
      process.env.BETTER_AUTH_URL = 'https://www.playroughrankings.dev/'
      
      const verificationUrl = 'https://playroughrankings.dev/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const result = normalizeAuthUrl(verificationUrl)
      
      expect(result).toContain('https://www.playroughrankings.dev')
      expect(result).toContain('/api/auth/verify-email')
      expect(result).toContain('token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    })

    it('should normalize password reset URLs', () => {
      process.env.BETTER_AUTH_URL = 'https://playroughrankings.dev/'
      
      const resetUrl = 'https://www.playroughrankings.dev/api/auth/reset-password?token=reset-token-123'
      const result = normalizeAuthUrl(resetUrl)
      
      expect(result).toContain('https://playroughrankings.dev')
      expect(result).toContain('/api/auth/reset-password')
      expect(result).toContain('token=reset-token-123')
    })
  })
})

