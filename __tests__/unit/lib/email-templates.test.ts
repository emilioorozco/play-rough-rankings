/**
 * Unit tests for Email Template System
 * 
 * Tests email template builder and factory functions including:
 * - EmailTemplateBuilder HTML and text generation
 * - Template factory functions with various input data
 * - Mobile responsive styles and HTML escaping
 * - Brand colors and consistent structure across all templates
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EmailTemplateBuilder } from '@/lib/email/templates/builder'
import {
  createVerificationEmailTemplate,
  createPasswordResetEmailTemplate,
  createRoleInvitationEmailTemplate,
  emailTemplateBuilder,
} from '@/lib/email/templates'
import type {
  EmailBrandConfig,
  EmailTemplateData,
} from '@/lib/email/templates/types'

describe('Email Template System', () => {
  // Test brand configuration
  const testBrandConfig: EmailBrandConfig = {
    appName: 'Test App',
    appUrl: 'https://test.example.com',
    colors: {
      primary: '#E83F6F',
      danger: '#dc3545',
      success: '#28a745',
      text: '#333333',
      textLight: '#666666',
      textMuted: '#999999',
      background: '#FCF7F1',
    },
  }

  describe('EmailTemplateBuilder', () => {
    let builder: EmailTemplateBuilder

    beforeEach(() => {
      builder = new EmailTemplateBuilder(testBrandConfig)
    })

    describe('HTML Generation', () => {
      it('should generate valid HTML email with all required sections', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test Subject',
          heading: 'Test Heading',
          body: 'Test body content',
          ctaText: 'Click Here',
          ctaUrl: 'https://example.com/action',
          ctaColor: 'primary',
          securityNote: 'This is a security note',
        }

        const result = builder.build(templateData)

        // Verify HTML structure
        expect(result.html).toContain('<!DOCTYPE html>')
        expect(result.html).toContain('<html lang="en">')
        expect(result.html).toContain('</html>')
        expect(result.html).toContain('<head>')
        expect(result.html).toContain('<body')
        expect(result.html).toContain('</body>')
      })

      it('should include meta tags for responsive design', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('<meta charset="UTF-8">')
        expect(result.html).toContain(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        )
        expect(result.html).toContain(
          '<meta http-equiv="X-UA-Compatible" content="IE=edge">'
        )
      })

      it('should include mobile responsive CSS styles', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        // Check for responsive media query
        expect(result.html).toContain('@media only screen and (max-width: 600px)')
        expect(result.html).toContain('.email-container')
        expect(result.html).toContain('width: 100% !important')
        expect(result.html).toContain('.email-content')
        expect(result.html).toContain('padding: 20px !important')
      })

      it('should apply brand colors correctly', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        // Check for brand colors in HTML
        expect(result.html).toContain(testBrandConfig.colors.primary)
        expect(result.html).toContain(testBrandConfig.colors.text)
        expect(result.html).toContain(testBrandConfig.colors.textLight)
        expect(result.html).toContain(testBrandConfig.colors.textMuted)
        expect(result.html).toContain(testBrandConfig.colors.background)
      })

      it('should use correct CTA button color based on variant', () => {
        const variants: Array<'primary' | 'danger' | 'success'> = [
          'primary',
          'danger',
          'success',
        ]

        variants.forEach((variant) => {
          const templateData: EmailTemplateData = {
            subject: 'Test',
            heading: 'Test',
            body: 'Test',
            ctaText: 'Test',
            ctaUrl: 'https://example.com',
            ctaColor: variant,
            securityNote: 'Test',
          }

          const result = builder.build(templateData)
          expect(result.html).toContain(testBrandConfig.colors[variant])
        })
      })

      it('should handle array body content with multiple paragraphs', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: ['First paragraph', 'Second paragraph', 'Third paragraph'],
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        // Each paragraph should be wrapped in <p> tags
        expect(result.html).toContain('First paragraph')
        expect(result.html).toContain('Second paragraph')
        expect(result.html).toContain('Third paragraph')
        
        // Count paragraph tags
        const paragraphMatches = result.html.match(/<p[^>]*>First paragraph<\/p>/g)
        expect(paragraphMatches).toBeTruthy()
      })

      it('should include preheader when provided', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          preheader: 'This is a preheader text',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('This is a preheader text')
        expect(result.html).toContain('display: none')
        expect(result.html).toContain('max-height: 0')
        expect(result.html).toContain('aria-hidden="true"')
      })

      it('should not include preheader section when not provided', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        // Should not have the preheader div
        expect(result.html).not.toContain('aria-hidden="true"')
      })

      it('should include custom footer when provided', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
          footer: 'Custom footer text',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('Custom footer text')
      })

      it('should include app name in header', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain(testBrandConfig.appName)
      })

      it('should use logo image when logoUrl is provided', () => {
        const builderWithLogo = new EmailTemplateBuilder({
          ...testBrandConfig,
          logoUrl: 'https://example.com/logo.png',
        })

        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builderWithLogo.build(templateData)

        expect(result.html).toContain('<img')
        expect(result.html).toContain('https://example.com/logo.png')
        expect(result.html).toContain(`alt="${testBrandConfig.appName}"`)
      })

      it('should include current year in footer', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)
        const currentYear = new Date().getFullYear()

        expect(result.html).toContain(`© ${currentYear}`)
      })

      it('should include CTA button with correct URL', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Click Me',
          ctaUrl: 'https://example.com/action?token=abc123',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('Click Me')
        expect(result.html).toContain('https://example.com/action?token=abc123')
        expect(result.html).toContain('<a href=')
      })

      it('should include fallback URL text for email clients', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com/action',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('Or copy and paste this link')
        expect(result.html).toContain('word-break: break-all')
      })
    })

    describe('HTML Escaping', () => {
      it('should escape HTML special characters in heading', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: '<script>alert("xss")</script>',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).not.toContain('<script>')
        expect(result.html).toContain('&lt;script&gt;')
        expect(result.html).toContain('&lt;/script&gt;')
      })

      it('should escape HTML special characters in body', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Hello <b>World</b> & "Friends"',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&lt;b&gt;')
        expect(result.html).toContain('&amp;')
        expect(result.html).toContain('&quot;')
      })

      it('should escape HTML in array body content', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: [
            'First <script>alert(1)</script>',
            'Second & third',
            'Fourth "quoted"',
          ],
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&lt;script&gt;')
        expect(result.html).toContain('&amp;')
        expect(result.html).toContain('&quot;')
      })

      it('should escape HTML in CTA text', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Click <here>',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&lt;here&gt;')
      })

      it('should escape HTML in security note', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Security <note> & "warning"',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&lt;note&gt;')
        expect(result.html).toContain('&amp;')
        expect(result.html).toContain('&quot;')
      })

      it('should escape HTML in footer', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
          footer: 'Footer <b>text</b>',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&lt;b&gt;')
      })

      it('should escape apostrophes', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: "It's a test",
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.html).toContain('&#39;')
      })
    })

    describe('Plain Text Generation', () => {
      it('should generate plain text email', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test Subject',
          heading: 'Test Heading',
          body: 'Test body content',
          ctaText: 'Click Here',
          ctaUrl: 'https://example.com/action',
          ctaColor: 'primary',
          securityNote: 'This is a security note',
        }

        const result = builder.build(templateData)

        expect(result.text).toBeTruthy()
        expect(result.text).toContain('Test Heading')
        expect(result.text).toContain('Test body content')
        expect(result.text).toContain('Click Here: https://example.com/action')
        expect(result.text).toContain('This is a security note')
      })

      it('should include app name and URL in plain text', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.text).toContain(testBrandConfig.appName)
        expect(result.text).toContain(testBrandConfig.appUrl)
      })

      it('should handle array body content with line breaks', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: ['First paragraph', 'Second paragraph', 'Third paragraph'],
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        expect(result.text).toContain('First paragraph')
        expect(result.text).toContain('Second paragraph')
        expect(result.text).toContain('Third paragraph')
        
        // Paragraphs should be separated by double line breaks
        expect(result.text).toContain('First paragraph\n\nSecond paragraph')
      })

      it('should include footer in plain text when provided', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test',
          body: 'Test',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
          footer: 'Custom footer',
        }

        const result = builder.build(templateData)

        expect(result.text).toContain('Custom footer')
      })

      it('should not escape HTML in plain text', () => {
        const templateData: EmailTemplateData = {
          subject: 'Test',
          heading: 'Test <heading>',
          body: 'Test & body',
          ctaText: 'Test',
          ctaUrl: 'https://example.com',
          ctaColor: 'primary',
          securityNote: 'Test',
        }

        const result = builder.build(templateData)

        // Plain text should not have HTML entities
        expect(result.text).toContain('Test <heading>')
        expect(result.text).toContain('Test & body')
        expect(result.text).not.toContain('&lt;')
        expect(result.text).not.toContain('&amp;')
      })
    })
  })

  describe('Template Factory Functions', () => {
    describe('createVerificationEmailTemplate', () => {
      it('should create verification email template with correct data', () => {
        const data = {
          userName: 'John Doe',
          verificationUrl: 'https://example.com/verify?token=abc123',
        }

        const template = createVerificationEmailTemplate(data)

        expect(template.subject).toBe('Verify your email address')
        expect(template.heading).toBe('Verify Your Email Address')
        expect(template.ctaText).toBe('Verify Email')
        expect(template.ctaUrl).toBe(data.verificationUrl)
        expect(template.ctaColor).toBe('primary')
      })

      it('should include user name in body', () => {
        const data = {
          userName: 'Jane Smith',
          verificationUrl: 'https://example.com/verify',
        }

        const template = createVerificationEmailTemplate(data)

        expect(Array.isArray(template.body)).toBe(true)
        if (Array.isArray(template.body)) {
          expect(template.body[0]).toContain('Jane Smith')
        }
      })

      it('should include preheader text', () => {
        const data = {
          userName: 'Test User',
          verificationUrl: 'https://example.com/verify',
        }

        const template = createVerificationEmailTemplate(data)

        expect(template.preheader).toBe(
          'Complete your registration by verifying your email'
        )
      })

      it('should mention 24 hour expiration in security note', () => {
        const data = {
          userName: 'Test User',
          verificationUrl: 'https://example.com/verify',
        }

        const template = createVerificationEmailTemplate(data)

        expect(template.securityNote).toContain('24 hours')
      })
    })

    describe('createPasswordResetEmailTemplate', () => {
      it('should create password reset email template with correct data', () => {
        const data = {
          userName: 'John Doe',
          resetUrl: 'https://example.com/reset?token=xyz789',
        }

        const template = createPasswordResetEmailTemplate(data)

        expect(template.subject).toBe('Reset your password')
        expect(template.heading).toBe('Reset Your Password')
        expect(template.ctaText).toBe('Reset Password')
        expect(template.ctaUrl).toBe(data.resetUrl)
        expect(template.ctaColor).toBe('danger')
      })

      it('should include user name in body', () => {
        const data = {
          userName: 'Jane Smith',
          resetUrl: 'https://example.com/reset',
        }

        const template = createPasswordResetEmailTemplate(data)

        expect(Array.isArray(template.body)).toBe(true)
        if (Array.isArray(template.body)) {
          expect(template.body[0]).toContain('Jane Smith')
        }
      })

      it('should include preheader text', () => {
        const data = {
          userName: 'Test User',
          resetUrl: 'https://example.com/reset',
        }

        const template = createPasswordResetEmailTemplate(data)

        expect(template.preheader).toBe('You requested to reset your password')
      })

      it('should mention 1 hour expiration in security note', () => {
        const data = {
          userName: 'Test User',
          resetUrl: 'https://example.com/reset',
        }

        const template = createPasswordResetEmailTemplate(data)

        expect(template.securityNote).toContain('1 hour')
      })
    })

    describe('createRoleInvitationEmailTemplate', () => {
      it('should create organizer invitation template with correct data', () => {
        const data = {
          role: 'organizer' as const,
          inviterName: 'Admin User',
          invitationUrl: 'https://example.com/invite?token=inv123',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(template.subject).toContain('Tournament Organizer')
        expect(template.heading).toBe("You've Been Invited!")
        expect(template.ctaText).toBe('Accept Invitation')
        expect(template.ctaUrl).toBe(data.invitationUrl)
        expect(template.ctaColor).toBe('success')
      })

      it('should create admin invitation template with correct data', () => {
        const data = {
          role: 'admin' as const,
          inviterName: 'Super Admin',
          invitationUrl: 'https://example.com/invite?token=inv456',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(template.subject).toContain('Administrator')
        expect(template.heading).toBe("You've Been Invited!")
        expect(template.ctaText).toBe('Accept Invitation')
        expect(template.ctaUrl).toBe(data.invitationUrl)
        expect(template.ctaColor).toBe('success')
      })

      it('should include inviter name in body for organizer role', () => {
        const data = {
          role: 'organizer' as const,
          inviterName: 'Admin User',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(Array.isArray(template.body)).toBe(true)
        if (Array.isArray(template.body)) {
          const bodyText = template.body.join(' ')
          expect(bodyText).toContain('Admin User')
          expect(bodyText).toContain('Tournament Organizer')
        }
      })

      it('should include inviter name in body for admin role', () => {
        const data = {
          role: 'admin' as const,
          inviterName: 'Super Admin',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(Array.isArray(template.body)).toBe(true)
        if (Array.isArray(template.body)) {
          const bodyText = template.body.join(' ')
          expect(bodyText).toContain('Super Admin')
          expect(bodyText).toContain('Administrator')
        }
      })

      it('should include preheader text with inviter name', () => {
        const data = {
          role: 'organizer' as const,
          inviterName: 'Admin User',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(template.preheader).toContain('Admin User')
        expect(template.preheader).toContain('Tournament Organizer')
      })

      it('should mention 7 day expiration in security note', () => {
        const data = {
          role: 'organizer' as const,
          inviterName: 'Admin User',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        expect(template.securityNote).toContain('7 days')
      })

      it('should describe organizer permissions correctly', () => {
        const data = {
          role: 'organizer' as const,
          inviterName: 'Admin User',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        if (Array.isArray(template.body)) {
          const bodyText = template.body.join(' ')
          expect(bodyText).toContain('create and manage tournaments')
        }
      })

      it('should describe admin permissions correctly', () => {
        const data = {
          role: 'admin' as const,
          inviterName: 'Super Admin',
          invitationUrl: 'https://example.com/invite',
        }

        const template = createRoleInvitationEmailTemplate(data)

        if (Array.isArray(template.body)) {
          const bodyText = template.body.join(' ')
          expect(bodyText).toContain('manage users, games, and all tournaments')
        }
      })
    })
  })

  describe('Default Email Template Builder', () => {
    it('should be configured with Play Rough Rankings branding', () => {
      const templateData: EmailTemplateData = {
        subject: 'Test',
        heading: 'Test',
        body: 'Test',
        ctaText: 'Test',
        ctaUrl: 'https://example.com',
        ctaColor: 'primary',
        securityNote: 'Test',
      }

      const result = emailTemplateBuilder.build(templateData)

      expect(result.html).toContain('Play Rough Rankings')
      expect(result.html).toContain('#E83F6F') // Primary pink color
      expect(result.html).toContain('#FCF7F1') // Background color
    })

    it('should use environment URL or default to localhost', () => {
      const templateData: EmailTemplateData = {
        subject: 'Test',
        heading: 'Test',
        body: 'Test',
        ctaText: 'Test',
        ctaUrl: 'https://example.com',
        ctaColor: 'primary',
        securityNote: 'Test',
      }

      const result = emailTemplateBuilder.build(templateData)

      // Should contain either the environment URL or localhost
      const containsUrl =
        result.html.includes(process.env.NEXT_PUBLIC_APP_URL || '') ||
        result.html.includes('http://localhost:3000')
      
      expect(containsUrl).toBe(true)
    })
  })

  describe('Brand Consistency', () => {
    it('should use consistent brand colors across all template types', () => {
      const verificationTemplate = createVerificationEmailTemplate({
        userName: 'Test',
        verificationUrl: 'https://example.com/verify',
      })

      const resetTemplate = createPasswordResetEmailTemplate({
        userName: 'Test',
        resetUrl: 'https://example.com/reset',
      })

      const invitationTemplate = createRoleInvitationEmailTemplate({
        role: 'organizer',
        inviterName: 'Test',
        invitationUrl: 'https://example.com/invite',
      })

      const verificationHtml = emailTemplateBuilder.build(verificationTemplate).html
      const resetHtml = emailTemplateBuilder.build(resetTemplate).html
      const invitationHtml = emailTemplateBuilder.build(invitationTemplate).html

      // All should contain brand colors
      const brandColor = '#E83F6F'
      expect(verificationHtml).toContain(brandColor)
      expect(resetHtml).toContain(brandColor)
      expect(invitationHtml).toContain(brandColor)

      // All should contain app name
      expect(verificationHtml).toContain('Play Rough Rankings')
      expect(resetHtml).toContain('Play Rough Rankings')
      expect(invitationHtml).toContain('Play Rough Rankings')
    })

    it('should have consistent structure across all template types', () => {
      const templates = [
        createVerificationEmailTemplate({
          userName: 'Test',
          verificationUrl: 'https://example.com/verify',
        }),
        createPasswordResetEmailTemplate({
          userName: 'Test',
          resetUrl: 'https://example.com/reset',
        }),
        createRoleInvitationEmailTemplate({
          role: 'organizer',
          inviterName: 'Test',
          invitationUrl: 'https://example.com/invite',
        }),
      ]

      templates.forEach((template) => {
        const result = emailTemplateBuilder.build(template)

        // All should have required sections
        expect(result.html).toContain('<!DOCTYPE html>')
        expect(result.html).toContain('<head>')
        expect(result.html).toContain('<body')
        expect(result.html).toContain('role="presentation"')
        
        // HTML version may have escaped characters, so check for either version
        const hasHeading = result.html.includes(template.heading) || 
                          result.html.includes(template.heading.replace(/'/g, '&#39;'))
        expect(hasHeading).toBe(true)
        
        expect(result.html).toContain(template.ctaText)
        
        // Verify HTML has substantial content
        expect(result.html.length).toBeGreaterThan(500)

        // All should have plain text version with unescaped content
        expect(result.text).toContain(template.heading)
        expect(result.text).toContain(template.ctaText)
        expect(result.text).toContain(template.securityNote)
      })
    })

    it('should use appropriate CTA colors for each template type', () => {
      const verificationTemplate = createVerificationEmailTemplate({
        userName: 'Test',
        verificationUrl: 'https://example.com/verify',
      })

      const resetTemplate = createPasswordResetEmailTemplate({
        userName: 'Test',
        resetUrl: 'https://example.com/reset',
      })

      const invitationTemplate = createRoleInvitationEmailTemplate({
        role: 'organizer',
        inviterName: 'Test',
        invitationUrl: 'https://example.com/invite',
      })

      expect(verificationTemplate.ctaColor).toBe('primary')
      expect(resetTemplate.ctaColor).toBe('danger')
      expect(invitationTemplate.ctaColor).toBe('success')
    })
  })
})
