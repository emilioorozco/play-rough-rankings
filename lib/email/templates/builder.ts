/**
 * Email Template Builder
 * 
 * Generates consistent, branded HTML and plain text emails with
 * responsive design and accessibility features.
 */

import type {
  EmailTemplateData,
  EmailBrandConfig,
  EmailTemplateResult,
} from './types'

/**
 * EmailTemplateBuilder class for generating branded email templates
 * with consistent styling and responsive design.
 */
export class EmailTemplateBuilder {
  private config: EmailBrandConfig

  constructor(config: EmailBrandConfig) {
    this.config = config
  }

  /**
   * Build complete email from template data
   * @param data - Email template data
   * @returns Object containing HTML and plain text versions
   */
  build(data: EmailTemplateData): EmailTemplateResult {
    return {
      html: this.buildHtml(data),
      text: this.buildText(data),
    }
  }

  /**
   * Generate HTML email with responsive design and brand styling
   * @param data - Email template data
   * @returns HTML string
   */
  private buildHtml(data: EmailTemplateData): string {
    // Escape HTML in user-provided content to prevent XSS
    const safeData = {
      ...data,
      heading: this.escapeHtml(data.heading),
      body: Array.isArray(data.body)
        ? data.body.map(p => this.escapeHtml(p))
        : this.escapeHtml(data.body),
      ctaText: this.escapeHtml(data.ctaText),
      securityNote: this.escapeHtml(data.securityNote),
      footer: data.footer ? this.escapeHtml(data.footer) : undefined,
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        ${this.renderHead(safeData)}
        <body style="margin: 0; padding: 0; background-color: ${this.config.colors.background}; font-family: Arial, sans-serif;">
          ${this.renderPreheader(safeData.preheader)}
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" class="email-container" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(232, 63, 111, 0.08); overflow: hidden;">
                  ${this.renderHeader()}
                  ${this.renderContent(safeData)}
                  ${this.renderFooter(safeData.footer)}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `.trim()
  }

  /**
   * Generate plain text email for email client compatibility
   * @param data - Email template data
   * @returns Plain text string
   */
  private buildText(data: EmailTemplateData): string {
    const bodyText = Array.isArray(data.body)
      ? data.body.join('\n\n')
      : data.body

    return `
${data.heading}

${bodyText}

${data.ctaText}: ${data.ctaUrl}

${data.securityNote}

${data.footer || ''}

---
${this.config.appName}
${this.config.appUrl}
    `.trim()
  }

  /**
   * Render HTML head section with meta tags and responsive styles
   * @param data - Email template data
   * @returns HTML head string
   */
  private renderHead(data: EmailTemplateData): string {
    return `
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${this.escapeHtml(data.subject)}</title>
        <style>
          /* Responsive styles for mobile devices */
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
            .email-content {
              padding: 30px 24px !important;
            }
            .header-content {
              padding: 32px 24px 24px !important;
            }
            .footer-content {
              padding: 24px !important;
            }
            h1 {
              font-size: 24px !important;
            }
            h2 {
              font-size: 20px !important;
            }
            .verify-button {
              padding: 16px 32px !important;
              font-size: 15px !important;
            }
          }
        </style>
      </head>
    `
  }

  /**
   * Render preheader text (visible in email client preview)
   * @param preheader - Optional preheader text
   * @returns HTML string or empty string
   */
  private renderPreheader(preheader?: string): string {
    if (!preheader) return ''
    
    return `
      <div style="display: none; max-height: 0; overflow: hidden;" aria-hidden="true">
        ${this.escapeHtml(preheader)} ✓
      </div>
    `
  }

  /**
   * Render email header with logo or app name
   * @returns HTML string
   */
  private renderHeader(): string {
    const headerContent = this.config.logoUrl
      ? `<img src="${this.escapeHtml(this.config.logoUrl)}" alt="${this.escapeHtml(this.config.appName)}" style="height: 50px; max-width: 100%;">`
      : `<h1 style="margin: 0; color: ${this.config.colors.primary}; font-family: Arial, sans-serif; font-size: 28px; letter-spacing: -0.5px;">${this.escapeHtml(this.config.appName)}</h1>
              <div style="margin-top: 16px; width: 60px; height: 3px; background-color: ${this.config.colors.primary}; margin-left: auto; margin-right: auto; border-radius: 2px;"></div>`

    return `
      <tr>
        <td class="header-content" style="padding: 48px 48px 32px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, #fffbf8 100%);">
          ${headerContent}
        </td>
      </tr>
    `
  }

  /**
   * Render main email content with heading, body, and CTA button
   * @param data - Email template data
   * @returns HTML string
   */
  private renderContent(data: EmailTemplateData): string {
    const bodyParagraphs = Array.isArray(data.body)
      ? data.body.map(p => `<p style="margin: 0 0 16px; line-height: 1.7; color: #4a4a4a; font-size: 16px; text-align: center;">${p}</p>`).join('')
      : `<p style="margin: 0 0 32px; line-height: 1.7; color: #4a4a4a; font-size: 16px; text-align: center;">${data.body}</p>`

    const ctaColor = this.config.colors[data.ctaColor]

    return `
      <tr>
        <td class="email-content" style="padding: 40px 48px 48px; font-family: Arial, sans-serif;">
          <h2 style="margin: 0 0 24px; color: #1a1a1a; font-size: 26px; font-weight: 600; text-align: center; line-height: 1.3;">${data.heading}</h2>
          ${bodyParagraphs}
          <table role="presentation" style="margin: 0 auto 32px; border-collapse: collapse;">
            <tr>
              <td style="border-radius: 6px; background-color: ${ctaColor}; box-shadow: 0 4px 12px rgba(232, 63, 111, 0.25);">
                <a href="${this.escapeHtml(data.ctaUrl)}" class="verify-button" style="display: inline-block; padding: 16px 40px; color: white; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 6px;">${data.ctaText}</a>
              </td>
            </tr>
          </table>
          <div style="border-top: 1px solid #e8e8e8; margin: 32px 0;"></div>
          <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
            <p style="margin: 0 0 12px; font-size: 14px; color: #666666; font-weight: 600;">
              Trouble clicking the button?
            </p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #666666;">
              Copy and paste this link into your browser:
            </p>
            <p style="margin: 0; font-size: 13px; color: ${this.config.colors.primary}; word-break: break-all; font-family: 'Courier New', monospace;">
              ${this.escapeHtml(data.ctaUrl)}
            </p>
          </div>
          <div style="border-left: 3px solid ${this.config.colors.primary}; padding-left: 16px; margin-top: 32px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #333333; font-weight: 600;">
              Security Notice
            </p>
            <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.6;">
              ${data.securityNote}
            </p>
          </div>
        </td>
      </tr>
    `
  }

  /**
   * Render email footer with copyright and links
   * @param customFooter - Optional custom footer text
   * @returns HTML string
   */
  private renderFooter(customFooter?: string): string {
    const currentYear = new Date().getFullYear()
    
    // TODO: Add social media links (Twitter, Discord, etc.) when available
    
    return `
      <tr>
        <td class="footer-content" style="padding: 32px 48px; background-color: #f8f9fa; border-top: 1px solid #eee; font-family: Arial, sans-serif; text-align: center;">
          ${customFooter
            ? `<p style="margin: 0 0 12px; font-size: 13px; color: ${this.config.colors.textMuted}; line-height: 1.6;">${customFooter}</p>`
            : ''
          }
          <p style="margin: 0 0 12px; font-size: 13px; color: #999999; line-height: 1.6;">
            © ${currentYear} ${this.escapeHtml(this.config.appName)}. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 13px; white-space: nowrap;">
            <a href="${this.escapeHtml(this.config.appUrl)}" style="color: ${this.config.colors.primary}; text-decoration: none; font-weight: 600;">Visit ${this.escapeHtml(this.config.appName)}</a>
            <span style="color: #ccc; margin: 0 8px;">•</span>
            <a href="${this.escapeHtml(this.config.appUrl)}/contact" style="color: #666666; text-decoration: none;">Contact&nbsp;Us</a>
          </p>
        </td>
      </tr>
    `
  }

  /**
   * Escape HTML special characters to prevent XSS attacks
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return text.replace(/[&<>"']/g, char => htmlEscapeMap[char] || char)
  }
}
