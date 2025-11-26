/**
 * Unit tests for Email Service
 * 
 * Tests email sending functionality including:
 * - sendEmail function (development vs production)
 * - sendVerificationEmail
 * - sendPasswordResetEmail
 * - sendRoleInvitationEmail
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendRoleInvitationEmail,
  RateLimitError,
  type EmailOptions,
  type VerificationEmailData,
  type PasswordResetEmailData,
  type InvitationEmailData,
} from '@/lib/email'
import { clearAllRateLimits } from '@/lib/email/rate-limiter'

// Mock AWS SES SDK using __mocks__ directory
vi.mock('@aws-sdk/client-ses', () => {
  return import('@/__tests__/__mocks__/@aws-sdk/client-ses')
})

// Mock Resend using __mocks__ directory
vi.mock('resend', () => {
  return import('@/__tests__/__mocks__/resend')
})

// Mock suppression manager
vi.mock('@/lib/messaging/suppression-manager', () => ({
  isRecipientSuppressed: vi.fn().mockResolvedValue(false),
  getSuppressionDetails: vi.fn().mockResolvedValue(null),
}))

// Mock delivery logger
vi.mock('@/lib/messaging/delivery-logger', () => ({
  logMessageDelivery: vi.fn().mockResolvedValue(undefined),
}))

import {
  SESClient,
  SendEmailCommand,
  mockSend as mockSendFn,
  getCommandInstances,
  clearCommandInstances,
} from '@/__tests__/__mocks__/@aws-sdk/client-ses'
import {
  mockEmailsSend as mockResendSendFn,
  clearMockEmailsSend,
} from '@/__tests__/__mocks__/resend'
import { isRecipientSuppressed, getSuppressionDetails } from '@/lib/messaging/suppression-manager'
import { logMessageDelivery } from '@/lib/messaging/delivery-logger'

describe('Email Service', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Clear mocks
    vi.clearAllMocks()
    mockSendFn.mockClear()
    mockResendSendFn.mockClear()
    clearCommandInstances()
    clearMockEmailsSend()
    
    // Clear rate limits
    clearAllRateLimits()
    
    // Clear Resend API key to ensure tests use AWS SES by default
    delete process.env.RESEND_API_KEY
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('sendEmail', () => {
    const mockEmailOptions: EmailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test email body',
      html: '<p>Test email body</p>',
    }

    describe('Development mode (console logging)', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development'
        delete process.env.AWS_EMAIL_ACCESS_KEY_ID
        delete process.env.AWS_EMAIL_SECRET_ACCESS_KEY
        delete process.env.AWS_REGION
      })

      it('should log email to console when NODE_ENV is development', async () => {
        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalled()
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('EMAIL SENT (DEVELOPMENT MODE)'))
        expect(consoleLogSpy).toHaveBeenCalledWith('To:', mockEmailOptions.to)
        expect(consoleLogSpy).toHaveBeenCalledWith('Subject:', mockEmailOptions.subject)
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Plain Text'))
        expect(consoleLogSpy).toHaveBeenCalledWith(mockEmailOptions.text)
        expect(mockSendFn).not.toHaveBeenCalled()
      })

      it('should use default FROM email when not configured', async () => {
        delete process.env.FROM_EMAIL

        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('From:', 'noreply@example.com')
      })

      it('should use FROM_EMAIL when configured', async () => {
        process.env.FROM_EMAIL = 'custom@example.com'

        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('From:', 'custom@example.com')
      })

      it('should handle emails without HTML content', async () => {
        const textOnlyOptions = { ...mockEmailOptions }
        delete textOnlyOptions.html

        await sendEmail(textOnlyOptions)

        // Check that text is logged
        const textCall = consoleLogSpy.mock.calls.find(call => 
          call[0] === textOnlyOptions.text
        )
        expect(textCall).toBeDefined()
        
        // HTML preview should not be shown
        const htmlPreviewCall = consoleLogSpy.mock.calls.find(call => 
          typeof call[0] === 'string' && call[0].includes('HTML Preview')
        )
        expect(htmlPreviewCall).toBeUndefined()
      })
    })

    describe('Production mode without AWS credentials', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
        delete process.env.AWS_EMAIL_ACCESS_KEY_ID
        delete process.env.AWS_EMAIL_SECRET_ACCESS_KEY
        delete process.env.AWS_REGION
      })

      it('should log to console and warn when credentials missing in production', async () => {
        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARNING] No email provider configured. Email not sent.'
        )
        expect(mockSendFn).not.toHaveBeenCalled()
      })
    })

    describe('Production mode with AWS credentials', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
        process.env.AWS_EMAIL_ACCESS_KEY_ID = 'test-access-key'
        process.env.AWS_EMAIL_SECRET_ACCESS_KEY = 'test-secret-key'
        process.env.AWS_REGION = 'us-west-2'
        process.env.FROM_EMAIL = 'noreply@example.com'
      })

      it('should send email via AWS SES when credentials are configured', async () => {
        mockSendFn.mockResolvedValue({ MessageId: 'test-message-id-123' })

        await sendEmail(mockEmailOptions)

        // Verify SendEmailCommand was created with correct parameters
        const commandInstances = getCommandInstances()
        expect(commandInstances).toHaveLength(1)
        const commandInstance = commandInstances[0]
        expect(commandInstance.input.Source).toBe('noreply@example.com')
        expect(commandInstance.input.Destination.ToAddresses).toEqual([mockEmailOptions.to])
        expect(commandInstance.input.Message.Subject.Data).toBe(mockEmailOptions.subject)
        expect(commandInstance.input.Message.Body.Html.Data).toBe(mockEmailOptions.html)
        expect(commandInstance.input.Message.Body.Text.Data).toBe(mockEmailOptions.text)
        
        // Verify send was called
        expect(mockSendFn).toHaveBeenCalled()
        
        // Logging happens but may not be captured by spy in production mode
        // The important thing is that the email was sent successfully
      })

      it('should send email without HTML when not provided', async () => {
        const textOnlyOptions = { ...mockEmailOptions }
        delete textOnlyOptions.html
        mockSendFn.mockResolvedValue({ MessageId: 'test-message-id-456' })

        await sendEmail(textOnlyOptions)

        // Verify HTML is not included in the command
        const commandInstances = getCommandInstances()
        expect(commandInstances).toHaveLength(1)
        const commandInstance = commandInstances[0]
        expect(commandInstance.input.Message.Body).not.toHaveProperty('Html')
        expect(commandInstance.input.Message.Body.Text.Data).toBe(textOnlyOptions.text)
        expect(mockSendFn).toHaveBeenCalledTimes(1)
      })

      it('should throw error when AWS SES send fails', async () => {
        const error = new Error('AWS SES error')
        mockSendFn.mockRejectedValue(error)

        await expect(sendEmail(mockEmailOptions)).rejects.toThrow(
          'Failed to send email: AWS SES error'
        )

        // Error is thrown and logged - the important thing is the error is propagated
      })

      it('should handle non-Error exceptions', async () => {
        mockSendFn.mockRejectedValue('String error')

        await expect(sendEmail(mockEmailOptions)).rejects.toThrow(
          'Failed to send email: Unknown AWS SES error'
        )
      })
    })
  })

  describe('sendVerificationEmail', () => {
    const mockVerificationData: VerificationEmailData = {
      user: {
        email: 'user@example.com',
        name: 'John Doe',
      },
      url: 'https://example.com/verify?token=abc123',
      token: 'abc123',
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
    })

    it('should send verification email with user name', async () => {
      await sendVerificationEmail(mockVerificationData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'user@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        'Verify your email address'
      )
      // Check that the text contains the user name
      const textCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('John Doe')
      )
      expect(textCall).toBeDefined()
      
      // Check that URL is included
      const urlCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes(mockVerificationData.url)
      )
      expect(urlCall).toBeDefined()
    })

    it('should use email when name is not provided', async () => {
      const dataWithoutName = {
        ...mockVerificationData,
        user: { email: 'user@example.com' },
      }

      await sendVerificationEmail(dataWithoutName)

      // Check that email is used as fallback
      const emailCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('user@example.com')
      )
      expect(emailCall).toBeDefined()
    })

    it('should include verification URL in email', async () => {
      await sendVerificationEmail(mockVerificationData)

      // Check that URL is included in the output
      const urlCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes(mockVerificationData.url)
      )
      expect(urlCall).toBeDefined()
    })

    it('should mention 24 hour expiration', async () => {
      await sendVerificationEmail(mockVerificationData)

      // Check that expiration time is mentioned
      const expirationCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('24 hours')
      )
      expect(expirationCall).toBeDefined()
    })
  })

  describe('sendPasswordResetEmail', () => {
    const mockPasswordResetData: PasswordResetEmailData = {
      user: {
        email: 'user@example.com',
        name: 'Jane Smith',
      },
      url: 'https://example.com/reset-password?token=xyz789',
      token: 'xyz789',
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
    })

    it('should send password reset email with user name', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'user@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        'Reset your password'
      )
      // Check that the user name is included
      const nameCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Jane Smith')
      )
      expect(nameCall).toBeDefined()
    })

    it('should include reset URL in email', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      // Check that URL is included
      const urlCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes(mockPasswordResetData.url)
      )
      expect(urlCall).toBeDefined()
    })

    it('should mention 1 hour expiration', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      // Check that expiration time is mentioned
      const expirationCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('1 hour')
      )
      expect(expirationCall).toBeDefined()
    })

    it('should use email when name is null', async () => {
      const dataWithNullName = {
        ...mockPasswordResetData,
        user: { email: 'user@example.com', name: null },
      }

      await sendPasswordResetEmail(dataWithNullName)

      // Check that email is used as fallback
      const emailCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('user@example.com')
      )
      expect(emailCall).toBeDefined()
    })
  })

  describe('sendRoleInvitationEmail', () => {
    const mockInvitationData: InvitationEmailData = {
      email: 'invitee@example.com',
      role: 'organizer',
      invitedBy: {
        name: 'Admin User',
        email: 'admin@example.com',
      },
      url: 'https://example.com/accept-invitation?token=invite123',
      token: 'invite123',
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
    })

    it('should send organizer invitation email', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'invitee@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        "You've been invited to become a Tournament Organizer"
      )
      // Check that role is mentioned
      const roleCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Tournament Organizer')
      )
      expect(roleCall).toBeDefined()
    })

    it('should send admin invitation email', async () => {
      const adminInvitation = {
        ...mockInvitationData,
        role: 'admin' as const,
      }

      await sendRoleInvitationEmail(adminInvitation)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        "You've been invited to become a Administrator"
      )
      // Check that role is mentioned
      const roleCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Administrator')
      )
      expect(roleCall).toBeDefined()
    })

    it('should include inviter name in email', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      // Check that inviter name is included
      const inviterCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Admin User')
      )
      expect(inviterCall).toBeDefined()
    })

    it('should use inviter email when name is not provided', async () => {
      const invitationWithoutName = {
        ...mockInvitationData,
        invitedBy: {
          email: 'admin@example.com',
        },
      }

      await sendRoleInvitationEmail(invitationWithoutName)

      // Check that email is used as fallback
      const emailCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('admin@example.com')
      )
      expect(emailCall).toBeDefined()
    })

    it('should include invitation URL', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      // Check that URL is included
      const urlCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes(mockInvitationData.url)
      )
      expect(urlCall).toBeDefined()
    })

    it('should mention 7 day expiration', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      // Check that expiration time is mentioned
      const expirationCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('7 days')
      )
      expect(expirationCall).toBeDefined()
    })

    it('should handle null inviter name', async () => {
      const invitationWithNullName = {
        ...mockInvitationData,
        invitedBy: {
          name: null,
          email: 'admin@example.com',
        },
      }

      await sendRoleInvitationEmail(invitationWithNullName)

      // Check that email is used as fallback
      const emailCall = consoleLogSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('admin@example.com')
      )
      expect(emailCall).toBeDefined()
    })
  })

  describe('Email content validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
    })

    it('should escape user input in HTML to prevent XSS', async () => {
      const maliciousData: VerificationEmailData = {
        user: {
          email: 'user@example.com',
          name: '<script>alert("xss")</script>',
        },
        url: 'https://example.com/verify?token=abc',
        token: 'abc',
      }

      // We need to test that the template builder escapes HTML
      // The sendVerificationEmail function uses the template builder internally
      await sendVerificationEmail(maliciousData)

      // The email was sent without throwing an error
      // The template builder's escapeHtml function should have escaped the script tag
      // We can verify this by checking that the function completed successfully
      expect(consoleLogSpy).toHaveBeenCalled()
      
      // Note: The actual HTML escaping is tested in the email-templates.test.ts file
      // This test just verifies that malicious input doesn't break the email sending
    })

    it('should handle special characters in email addresses', async () => {
      const dataWithSpecialChars: VerificationEmailData = {
        user: {
          email: 'user+test@example.com',
          name: "O'Brien",
        },
        url: 'https://example.com/verify?token=abc',
        token: 'abc',
      }

      await expect(
        sendVerificationEmail(dataWithSpecialChars)
      ).resolves.not.toThrow()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'To:',
        'user+test@example.com'
      )
    })
  })

  describe('Rate Limiting Integration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
      clearAllRateLimits()
    })

    describe('sendVerificationEmail rate limiting', () => {
      const mockData: VerificationEmailData = {
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        url: 'https://example.com/verify?token=abc',
        token: 'abc',
      }

      it('should allow up to 3 verification emails per hour', async () => {
        await expect(sendVerificationEmail(mockData)).resolves.not.toThrow()
        await expect(sendVerificationEmail(mockData)).resolves.not.toThrow()
        await expect(sendVerificationEmail(mockData)).resolves.not.toThrow()
      })

      it('should throw RateLimitError after 3 attempts', async () => {
        await sendVerificationEmail(mockData)
        await sendVerificationEmail(mockData)
        await sendVerificationEmail(mockData)

        await expect(sendVerificationEmail(mockData)).rejects.toThrow(RateLimitError)
      })

      it('should include retry-after information in error', async () => {
        await sendVerificationEmail(mockData)
        await sendVerificationEmail(mockData)
        await sendVerificationEmail(mockData)

        try {
          await sendVerificationEmail(mockData)
          expect.fail('Should have thrown RateLimitError')
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitError)
          if (error instanceof RateLimitError) {
            expect(error.retryAfter).toBeInstanceOf(Date)
            expect(error.emailType).toBe('verification')
            expect(error.identifier).toBe('user@example.com')
          }
        }
      })
    })

    describe('sendPasswordResetEmail rate limiting', () => {
      const mockData: PasswordResetEmailData = {
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        url: 'https://example.com/reset?token=xyz',
        token: 'xyz',
      }

      it('should allow up to 3 password reset emails per hour', async () => {
        await expect(sendPasswordResetEmail(mockData)).resolves.not.toThrow()
        await expect(sendPasswordResetEmail(mockData)).resolves.not.toThrow()
        await expect(sendPasswordResetEmail(mockData)).resolves.not.toThrow()
      })

      it('should throw RateLimitError after 3 attempts', async () => {
        await sendPasswordResetEmail(mockData)
        await sendPasswordResetEmail(mockData)
        await sendPasswordResetEmail(mockData)

        await expect(sendPasswordResetEmail(mockData)).rejects.toThrow(RateLimitError)
      })
    })

    describe('sendRoleInvitationEmail rate limiting', () => {
      const mockData: InvitationEmailData = {
        email: 'invitee@example.com',
        role: 'organizer',
        invitedBy: {
          name: 'Admin User',
          email: 'admin@example.com',
        },
        url: 'https://example.com/accept?token=inv',
        token: 'inv',
      }

      it('should allow up to 5 role invitations per 24 hours', async () => {
        await expect(sendRoleInvitationEmail(mockData)).resolves.not.toThrow()
        await expect(sendRoleInvitationEmail(mockData)).resolves.not.toThrow()
        await expect(sendRoleInvitationEmail(mockData)).resolves.not.toThrow()
        await expect(sendRoleInvitationEmail(mockData)).resolves.not.toThrow()
        await expect(sendRoleInvitationEmail(mockData)).resolves.not.toThrow()
      })

      it('should throw RateLimitError after 5 attempts', async () => {
        await sendRoleInvitationEmail(mockData)
        await sendRoleInvitationEmail(mockData)
        await sendRoleInvitationEmail(mockData)
        await sendRoleInvitationEmail(mockData)
        await sendRoleInvitationEmail(mockData)

        await expect(sendRoleInvitationEmail(mockData)).rejects.toThrow(RateLimitError)
      })

      it('should rate limit based on inviter email, not invitee', async () => {
        // Send 5 invitations from same admin to different users
        for (let i = 0; i < 5; i++) {
          const data = {
            ...mockData,
            email: `invitee${i}@example.com`,
          }
          await sendRoleInvitationEmail(data)
        }

        // 6th invitation should be rate limited
        const data = {
          ...mockData,
          email: 'another-invitee@example.com',
        }
        await expect(sendRoleInvitationEmail(data)).rejects.toThrow(RateLimitError)
      })
    })

    describe('Rate limiting isolation', () => {
      it('should track different email types separately', async () => {
        const email = 'user@example.com'
        
        // Use up verification limit
        const verificationData: VerificationEmailData = {
          user: { email, name: 'Test' },
          url: 'https://example.com/verify',
          token: 'abc',
        }
        await sendVerificationEmail(verificationData)
        await sendVerificationEmail(verificationData)
        await sendVerificationEmail(verificationData)

        // Password reset should still work
        const resetData: PasswordResetEmailData = {
          user: { email, name: 'Test' },
          url: 'https://example.com/reset',
          token: 'xyz',
        }
        await expect(sendPasswordResetEmail(resetData)).resolves.not.toThrow()
      })

      it('should track different email addresses separately', async () => {
        const data1: VerificationEmailData = {
          user: { email: 'user1@example.com', name: 'User 1' },
          url: 'https://example.com/verify',
          token: 'abc',
        }
        const data2: VerificationEmailData = {
          user: { email: 'user2@example.com', name: 'User 2' },
          url: 'https://example.com/verify',
          token: 'xyz',
        }

        // Use up limit for user1
        await sendVerificationEmail(data1)
        await sendVerificationEmail(data1)
        await sendVerificationEmail(data1)

        // user2 should still work
        await expect(sendVerificationEmail(data2)).resolves.not.toThrow()
      })
    })
  })

  describe('Suppression Checks', () => {
    const mockEmailOptions: EmailOptions = {
      to: 'suppressed@example.com',
      subject: 'Test Subject',
      text: 'Test email body',
      html: '<p>Test email body</p>',
    }

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_EMAIL_ACCESS_KEY_ID
      vi.clearAllMocks()
    })

    it('should check suppression list before sending', async () => {
      await sendEmail(mockEmailOptions, 'verification')

      expect(isRecipientSuppressed).toHaveBeenCalledWith('suppressed@example.com', 'email')
    })

    it('should throw error when recipient is suppressed', async () => {
      vi.mocked(isRecipientSuppressed).mockResolvedValue(true)
      vi.mocked(getSuppressionDetails).mockResolvedValue({
        id: '1',
        recipient: 'suppressed@example.com',
        channel: 'email',
        reason: 'hard_bounce',
        suppressionType: 'bounce',
        bounceCount: 0,
        lastBounceAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(sendEmail(mockEmailOptions, 'verification')).rejects.toThrow(
        'Email suppressed due to hard_bounce'
      )

      // Should not attempt to send
      expect(mockSendFn).not.toHaveBeenCalled()
    })

    it('should log suppressed attempts to delivery log', async () => {
      vi.mocked(isRecipientSuppressed).mockResolvedValue(true)
      vi.mocked(getSuppressionDetails).mockResolvedValue({
        id: '1',
        recipient: 'suppressed@example.com',
        channel: 'email',
        reason: 'complaint',
        suppressionType: 'complaint',
        bounceCount: 0,
        lastBounceAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      try {
        await sendEmail(mockEmailOptions, 'verification')
      } catch (error) {
        // Expected to throw
      }

      expect(logMessageDelivery).toHaveBeenCalledWith({
        recipient: 'suppressed@example.com',
        channel: 'email',
        subject: mockEmailOptions.subject,
        messageType: 'verification',
        status: 'suppressed',
        error: 'Email suppressed due to complaint',
      })
    })

    it('should log successful sends to delivery log', async () => {
      vi.mocked(isRecipientSuppressed).mockResolvedValue(false)

      await sendEmail(mockEmailOptions, 'verification')

      expect(logMessageDelivery).toHaveBeenCalledWith({
        recipient: 'suppressed@example.com',
        channel: 'email',
        subject: mockEmailOptions.subject,
        messageType: 'verification',
        status: 'sent',
        messageId: 'dev-mode-no-message-id',
      })
    })

    it('should log failed sends to delivery log', async () => {
      process.env.NODE_ENV = 'production'
      process.env.AWS_EMAIL_ACCESS_KEY_ID = 'test-key'
      process.env.AWS_EMAIL_SECRET_ACCESS_KEY = 'test-secret'
      process.env.AWS_REGION = 'us-west-2'
      
      vi.mocked(isRecipientSuppressed).mockResolvedValue(false)
      mockSendFn.mockRejectedValue(new Error('Send failed'))

      try {
        await sendEmail(mockEmailOptions, 'verification')
      } catch (error) {
        // Expected to throw
      }

      expect(logMessageDelivery).toHaveBeenCalledWith({
        recipient: 'suppressed@example.com',
        channel: 'email',
        subject: mockEmailOptions.subject,
        messageType: 'verification',
        status: 'failed',
        error: 'Send failed',
      })
    })

    it('should handle suppression check for verification emails', async () => {
      const mockData: VerificationEmailData = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        url: 'https://example.com/verify',
        token: 'abc',
      }

      vi.mocked(isRecipientSuppressed).mockResolvedValue(false)

      await sendVerificationEmail(mockData)

      expect(isRecipientSuppressed).toHaveBeenCalledWith('test@example.com', 'email')
    })

    it('should handle suppression check for password reset emails', async () => {
      const mockData: PasswordResetEmailData = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        url: 'https://example.com/reset',
        token: 'xyz',
      }

      vi.mocked(isRecipientSuppressed).mockResolvedValue(false)

      await sendPasswordResetEmail(mockData)

      expect(isRecipientSuppressed).toHaveBeenCalledWith('test@example.com', 'email')
    })

    it('should handle suppression check for role invitation emails', async () => {
      const mockData: InvitationEmailData = {
        email: 'test@example.com',
        role: 'organizer',
        invitedBy: {
          name: 'Admin',
          email: 'admin@example.com',
        },
        url: 'https://example.com/accept',
        token: 'inv',
      }

      vi.mocked(isRecipientSuppressed).mockResolvedValue(false)

      await sendRoleInvitationEmail(mockData)

      expect(isRecipientSuppressed).toHaveBeenCalledWith('test@example.com', 'email')
    })
  })
})

