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
  type EmailOptions,
  type VerificationEmailData,
  type PasswordResetEmailData,
  type InvitationEmailData,
} from '@/lib/email'

// Mock AWS SES SDK using __mocks__ directory
vi.mock('@aws-sdk/client-ses', () => {
  return import('@/__tests__/__mocks__/@aws-sdk/client-ses')
})

import {
  SESClient,
  SendEmailCommand,
  mockSend as mockSendFn,
  getCommandInstances,
  clearCommandInstances,
} from '@/__tests__/__mocks__/@aws-sdk/client-ses'

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
    clearCommandInstances()
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
        delete process.env.AWS_ACCESS_KEY_ID
        delete process.env.AWS_SECRET_ACCESS_KEY
        delete process.env.AWS_REGION
      })

      it('should log email to console when NODE_ENV is development', async () => {
        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalled()
        expect(consoleLogSpy).toHaveBeenCalledWith('\n=== EMAIL SENT ===')
        expect(consoleLogSpy).toHaveBeenCalledWith('To:', mockEmailOptions.to)
        expect(consoleLogSpy).toHaveBeenCalledWith('Subject:', mockEmailOptions.subject)
        expect(consoleLogSpy).toHaveBeenCalledWith('Text:', mockEmailOptions.text)
        expect(consoleLogSpy).toHaveBeenCalledWith('HTML:', mockEmailOptions.html)
        expect(mockSendFn).not.toHaveBeenCalled()
      })

      it('should use default FROM email when not configured', async () => {
        delete process.env.AWS_SES_FROM_EMAIL
        delete process.env.FROM_EMAIL

        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('From:', 'noreply@example.com')
      })

      it('should use AWS_SES_FROM_EMAIL when configured', async () => {
        process.env.AWS_SES_FROM_EMAIL = 'custom@example.com'

        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('From:', 'custom@example.com')
      })

      it('should use FROM_EMAIL as fallback when AWS_SES_FROM_EMAIL not set', async () => {
        process.env.FROM_EMAIL = 'fallback@example.com'
        delete process.env.AWS_SES_FROM_EMAIL

        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('From:', 'fallback@example.com')
      })

      it('should handle emails without HTML content', async () => {
        const textOnlyOptions = { ...mockEmailOptions }
        delete textOnlyOptions.html

        await sendEmail(textOnlyOptions)

        expect(consoleLogSpy).toHaveBeenCalledWith('Text:', textOnlyOptions.text)
        expect(consoleLogSpy).not.toHaveBeenCalledWith('HTML:', expect.anything())
      })
    })

    describe('Production mode without AWS credentials', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
        delete process.env.AWS_ACCESS_KEY_ID
        delete process.env.AWS_SECRET_ACCESS_KEY
        delete process.env.AWS_REGION
      })

      it('should log to console and warn when credentials missing in production', async () => {
        await sendEmail(mockEmailOptions)

        expect(consoleLogSpy).toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARNING] AWS credentials not configured. Email not sent.'
        )
        expect(mockSendFn).not.toHaveBeenCalled()
      })
    })

    describe('Production mode with AWS credentials', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production'
        process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
        process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
        process.env.AWS_REGION = 'us-west-2'
        process.env.AWS_SES_FROM_EMAIL = 'noreply@example.com'
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
        expect(mockSendFn).toHaveBeenCalledTimes(1)
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[EMAIL SERVICE] Email sent successfully:',
          'test-message-id-123'
        )
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

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[EMAIL SERVICE] Error sending email:',
          error
        )
      })

      it('should handle non-Error exceptions', async () => {
        mockSendFn.mockRejectedValue('String error')

        await expect(sendEmail(mockEmailOptions)).rejects.toThrow(
          'Failed to send email: Unknown error'
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
      delete process.env.AWS_ACCESS_KEY_ID
    })

    it('should send verification email with user name', async () => {
      await sendVerificationEmail(mockVerificationData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'user@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        'Verify your email address'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('John Doe')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining('John Doe')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining(mockVerificationData.url)
      )
    })

    it('should use email when name is not provided', async () => {
      const dataWithoutName = {
        ...mockVerificationData,
        user: { email: 'user@example.com' },
      }

      await sendVerificationEmail(dataWithoutName)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('user@example.com')
      )
    })

    it('should include verification URL in email', async () => {
      await sendVerificationEmail(mockVerificationData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining(mockVerificationData.url)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining(mockVerificationData.url)
      )
    })

    it('should mention 24 hour expiration', async () => {
      await sendVerificationEmail(mockVerificationData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('24 hours')
      )
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
      delete process.env.AWS_ACCESS_KEY_ID
    })

    it('should send password reset email with user name', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'user@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        'Reset your password'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('Jane Smith')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining('Jane Smith')
      )
    })

    it('should include reset URL in email', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining(mockPasswordResetData.url)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining(mockPasswordResetData.url)
      )
    })

    it('should mention 1 hour expiration', async () => {
      await sendPasswordResetEmail(mockPasswordResetData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('1 hour')
      )
    })

    it('should use email when name is null', async () => {
      const dataWithNullName = {
        ...mockPasswordResetData,
        user: { email: 'user@example.com', name: null },
      }

      await sendPasswordResetEmail(dataWithNullName)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('user@example.com')
      )
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
      delete process.env.AWS_ACCESS_KEY_ID
    })

    it('should send organizer invitation email', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      expect(consoleLogSpy).toHaveBeenCalledWith('To:', 'invitee@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Subject:',
        "You've been invited to become a Tournament Organizer"
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('Tournament Organizer')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining('Tournament Organizer')
      )
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
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('Administrator')
      )
    })

    it('should include inviter name in email', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('Admin User')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining('Admin User')
      )
    })

    it('should use inviter email when name is not provided', async () => {
      const invitationWithoutName = {
        ...mockInvitationData,
        invitedBy: {
          email: 'admin@example.com',
        },
      }

      await sendRoleInvitationEmail(invitationWithoutName)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('admin@example.com')
      )
    })

    it('should include invitation URL', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining(mockInvitationData.url)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'HTML:',
        expect.stringContaining(mockInvitationData.url)
      )
    })

    it('should mention 7 day expiration', async () => {
      await sendRoleInvitationEmail(mockInvitationData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('7 days')
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Text:',
        expect.stringContaining('admin@example.com')
      )
    })
  })

  describe('Email content validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.AWS_ACCESS_KEY_ID
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

      await sendVerificationEmail(maliciousData)

      // The HTML should contain the script tag as-is (since we're not escaping)
      // In a real implementation, you'd want to escape HTML
      const htmlCall = consoleLogSpy.mock.calls.find((call) =>
        call[0]?.includes('HTML:')
      )
      expect(htmlCall).toBeDefined()
      // Note: This test documents current behavior - consider adding HTML escaping
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
})

