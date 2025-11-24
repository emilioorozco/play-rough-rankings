/**
 * Email Template System Types
 * 
 * Type definitions for the email template system used across
 * email verification, password reset, and role invitation flows.
 */

/**
 * Email template data structure containing all content and configuration
 * needed to generate both HTML and plain text email versions.
 */
export interface EmailTemplateData {
  /** Email subject line */
  subject: string;
  
  /** Optional preheader text (visible in email client preview) */
  preheader?: string;
  
  /** Main heading displayed in the email */
  heading: string;
  
  /** Email body content - can be a single string or array of paragraphs */
  body: string | string[];
  
  /** Call-to-action button text */
  ctaText: string;
  
  /** Call-to-action button URL */
  ctaUrl: string;
  
  /** Button color variant */
  ctaColor: 'primary' | 'danger' | 'success';
  
  /** Optional custom footer text */
  footer?: string;
  
  /** Security notice displayed at the bottom of the email */
  securityNote: string;
}

/**
 * Brand configuration for email templates including colors,
 * logo, and application information.
 */
export interface EmailBrandConfig {
  /** Application name displayed in emails */
  appName: string;
  
  /** Application base URL */
  appUrl: string;
  
  /** Optional logo URL for email header */
  logoUrl?: string;
  
  /** Brand color palette for email styling */
  colors: {
    /** Primary brand color (used for primary CTAs) */
    primary: string;
    
    /** Danger/warning color (used for destructive actions) */
    danger: string;
    
    /** Success color (used for positive actions) */
    success: string;
    
    /** Main text color */
    text: string;
    
    /** Light text color (for secondary text) */
    textLight: string;
    
    /** Muted text color (for hints and footnotes) */
    textMuted: string;
    
    /** Background color for email body */
    background: string;
  };
  
  /** Optional social media links */
  social?: {
    twitter?: string;
    discord?: string;
  };
}

/**
 * Data required to generate an email verification template
 */
export interface VerificationEmailData {
  /** User's display name or email */
  userName: string;
  
  /** Verification URL with token */
  verificationUrl: string;
}

/**
 * Data required to generate a password reset template
 */
export interface PasswordResetEmailData {
  /** User's display name or email */
  userName: string;
  
  /** Password reset URL with token */
  resetUrl: string;
}

/**
 * Data required to generate a role invitation template
 */
export interface RoleInvitationEmailData {
  /** Role being offered (organizer or admin) */
  role: 'organizer' | 'admin';
  
  /** Name of the person sending the invitation */
  inviterName: string;
  
  /** Invitation acceptance URL with token */
  invitationUrl: string;
}

/**
 * Result of building an email template containing both HTML and plain text versions
 */
export interface EmailTemplateResult {
  /** HTML version of the email */
  html: string;
  
  /** Plain text version of the email */
  text: string;
}
