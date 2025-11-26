import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  RateLimitError,
} from "./email";

/**
 * Normalize a URL to use BETTER_AUTH_URL as the base domain.
 * This ensures verification and password reset links always use the correct domain
 * regardless of which domain the user signed up from.
 */
export function normalizeAuthUrl(url: string): string {
  const authBaseUrl = process.env.BETTER_AUTH_URL;
  if (!authBaseUrl) return url;
  
  try {
    const urlObj = new URL(url);
    const authUrlObj = new URL(authBaseUrl);
    

    // Keep the pathname, search params, and hash
    return `${authUrlObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn(`[AUTH] Failed to normalize URL: ${url}`, error);
    return url;
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL!,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://appleid.apple.com",
  ].filter(Boolean) as string[],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true' || false, // Enable via env var
    autoSignInAfterVerification: true, // This should trigger afterSignUp after email verification
    sendResetPassword: async ({ user, url, token }, _request) => {
      try {
        const normalizedUrl = normalizeAuthUrl(url);
        await sendPasswordResetEmail({
          user: {
            email: user.email,
            name: user.name || undefined,
          },
          url: normalizedUrl,
          token,
        });
      } catch (error) {
        // Log rate limit errors with details
        if (error instanceof RateLimitError) {
          console.warn(
            `[AUTH] Rate limit exceeded for password reset email`,
            `\n  Email: ${user.email}`,
            `\n  Retry after: ${error.retryAfter.toISOString()}`,
            `\n  Message: ${error.message}`
          );
          throw error;
        }
        
        // Log other email send failures
        console.error(
          `[AUTH] Failed to send password reset email`,
          `\n  Email: ${user.email}`,
          `\n  Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, _request) => {
      try {
        // Normalize URL to always use BETTER_AUTH_URL domain
        const normalizedUrl = normalizeAuthUrl(url);
        await sendVerificationEmail({
          user: {
            email: user.email,
            name: user.name || undefined,
          },
          url: normalizedUrl,
          token,
        });
      } catch (error) {
        // Log rate limit errors with details
        if (error instanceof RateLimitError) {
          console.warn(
            `[AUTH] Rate limit exceeded for verification email`,
            `\n  Email: ${user.email}`,
            `\n  Retry after: ${error.retryAfter.toISOString()}`,
            `\n  Message: ${error.message}`
          );
          throw error;
        }
        
        // Log other email send failures
        console.error(
          `[AUTH] Failed to send verification email`,
          `\n  Email: ${user.email}`,
          `\n  Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    },
    sendOnSignUp: true, // Automatically send verification email upon sign-up
    autoSignInAfterVerification: true, // ✅ VERIFIED: Automatically sign in after verification (Requirement 1.5)
    expiresIn: 60 * 60 * 24, // Token expiration time in seconds (24 hours)
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["profile", "email", "openid"], // Request additional profile information
      profile: (profile: any) => {
        // Google provides given_name and family_name directly
        const firstName = profile.given_name || "";
        const lastName = profile.family_name || "";
        
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          firstName: firstName,
          lastName: lastName,
          image: profile.picture,
        };
      },
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      scope: ["identify", "email"], // Request user identification and email
      profile: (profile: any) => {
        // Discord doesn't provide separate first/last names, only username and global_name
        const displayName = profile.global_name || profile.username || "";
        
        // For Discord, we'll use the display name as firstName and leave lastName empty
        // Users can update their profile later if they want to provide separate names
        const firstName = displayName;
        const lastName = "";
        
        return {
          id: profile.id,
          email: profile.email,
          name: displayName,
          firstName: firstName,
          lastName: lastName,
          image: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
        };
      },
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      scope: ["name", "email"], // Apple OAuth scopes
      profile: (profile: any) => {
        // Apple provides name in a nested object structure
        // The name object is only available on first sign-in
        const name = profile.name || {};
        const firstName = name.firstName || "";
        const lastName = name.lastName || "";
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile.email?.split('@')[0] || "";
        
        return {
          id: profile.sub,
          email: profile.email,
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          image: null, // Apple doesn't provide profile images via OAuth
        };
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "player",
        input: false, // Don't allow users to set this directly
      },
      // dateOfBirth removed from auth additionalFields; field remains in DB model
      firstName: {
        type: "string",
        required: false,
        input: true, // Allow users to set this during registration
      },
      lastName: {
        type: "string",
        required: false,
        input: true, // Allow users to set this during registration
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  callbacks: {
    async onPasswordReset({ user: _user }: { user: any }) {
      // Future enhancement: Send security notification email to user
      // This would inform security-conscious users that their password was changed
      // Example:
      // await sendPasswordChangedNotification({
      //   user: {
      //     email: user.email,
      //     name: user.name || undefined,
      //   },
      //   timestamp: new Date(),
      // });
    },
    async beforeSignUp({ user, account }: { user: any; account: any }) {
      // For OAuth providers: Parse name to extract firstName and lastName during sign-up
      if (account && user.name && (!user.firstName && !user.lastName)) {
        const nameParts = user.name.trim().split(/\s+/);
        let firstName = "";
        let lastName = "";
        
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = "";
        } else if (nameParts.length === 2) {
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(" ");
        }
        
        user.firstName = firstName;
        user.lastName = lastName;
      }
      
      return user;
    },
    async afterSignUp({ user, account }: { user: any; account: any }) {
      // OAuth providers (Google, Discord, Apple) are already verified by the provider
      // Only auto-verify for OAuth providers or if email verification is disabled
      const isOAuthProvider = account && account.providerId !== 'credential';
      const emailVerificationRequired = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
      
      if (isOAuthProvider || !emailVerificationRequired) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        } catch (error) {
          console.error("Error auto-verifying email:", error);
        }
      }
      
      // Note: Player and UserPreferences records are now automatically created
      // by the Prisma extension in lib/prisma.ts, so no need to create them here
      return user;
    },
    async afterSignIn({ user, account }: { user: any; account: any }) {
      // Parse name from OAuth providers to extract firstName and lastName
      // Only do this if the provider didn't already set firstName/lastName (like Google does)
      if (account && user.name && (!user.firstName && !user.lastName)) {
        const nameParts = user.name.trim().split(/\s+/);
        let firstName = "";
        let lastName = "";
        
        if (nameParts.length === 1) {
          // Only one name part - treat as first name
          firstName = nameParts[0];
          lastName = "";
        } else if (nameParts.length === 2) {
          // Two name parts - first and last name
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          // More than two parts - first name is first part, rest is last name
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(" ");
        }
        
        // Update the user in the database
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              firstName: firstName,
              lastName: lastName,
            },
          });
        } catch (error) {
          console.error("Error updating user firstName/lastName:", error);
        }
      }
      
      // Ensure Player record exists for this user (defensive measure)
      try {
        await prisma.player.upsert({
          where: { userId: user.id },
          update: {}, // No updates needed if player already exists
          create: {
            userId: user.id,
          },
        });
      } catch (error) {
        console.error("Error ensuring Player record exists:", error);
      }
      
    },
    async onSuccess({ user: _user, account: _account }: { user: any; account: any }) {
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

/**
 * Validate required environment variables for email functionality
 * 
 * Checks that all required AWS SES environment variables are configured.
 * In production, missing variables will throw an error.
 * In development, missing variables will log a warning and allow console fallback.
 */
function validateEmailEnvironmentVariables(): void {
  const requiredVars = [
    'AWS_REGION',
    'AWS_EMAIL_ACCESS_KEY_ID',
    'AWS_EMAIL_SECRET_ACCESS_KEY',
    'FROM_EMAIL',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required email environment variables: ${missingVars.join(', ')}`;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, missing email variables are critical
      console.error(`[AUTH] [CRITICAL] ${errorMessage}`);
      console.error('[AUTH] Email functionality will not work without these variables.');
      console.error('[AUTH] Please configure AWS SES credentials in your environment.');
      throw new Error(errorMessage);
    } else {
      // In development, allow graceful fallback to console logging
      console.warn(`[AUTH] [WARNING] ${errorMessage}`);
      console.warn('[AUTH] Email functionality will fall back to console logging.');
      console.warn('[AUTH] To test email sending, configure AWS SES credentials.');
    }
  }
}

/**
 * Validate all required Better Auth environment variables
 * 
 * Checks that all required environment variables are configured.
 * Throws an error if any required variables are missing.
 */
function validateAuthEnvironmentVariables(): void {
  const requiredVars = [
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required authentication environment variables: ${missingVars.join(', ')}`;
    console.error(`[AUTH] [CRITICAL] ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  // Validate BETTER_AUTH_SECRET length (should be at least 32 characters)
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret.length < 32) {
    console.warn('[AUTH] [WARNING] BETTER_AUTH_SECRET should be at least 32 characters long for security');
  }
}

// Run validation on module load
try {
  validateAuthEnvironmentVariables();
  validateEmailEnvironmentVariables();
} catch (error) {
  console.error('[AUTH] Environment variable validation failed:', error);
  // In production, this will prevent the application from starting
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}
