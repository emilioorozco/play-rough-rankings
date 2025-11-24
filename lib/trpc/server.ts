import { TRPCError } from "@trpc/server";
import { prisma, basePrismaClient } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  TournamentListQuerySchema,
  CreateTournamentSchema,
  UpdateTournamentSchema,
  CreateStoreSchema,
} from "@/lib/schemas";
import type {
  DateFilterClause,
} from "@/lib/types/backend";
import type { ApiTournamentListResponse } from "@/lib/types/api";
import { getActiveGamesAsJSON, getGameOrThrow } from "@/lib/games";
import { getDisplayName, getPublicDisplayName, userPublicSelectMinimal, userPublicSelectWithPrefs } from "@/lib/utils/user";

// Enhanced context type for tRPC
export type TRPCContext = {
  prisma: typeof prisma;
  basePrisma: typeof basePrismaClient;
  headers: Headers | null;
  user?: { id: string; email: string; name?: string; role: string };
  session?: { id: string; userId: string; expiresAt: Date };
};

// List of public procedure paths that don't require session validation
// These are procedures that use publicProcedure and don't need user context
const PUBLIC_PROCEDURE_PATHS = new Set([
  'health',
  'auth.resendVerificationEmail',
  'auth.verifyEmail',
  'auth.requestPasswordReset',
  'auth.resetPassword',
  'auth.getRoleInvitation',
  'games.list',
  'games.getById',
  'games.getStats',
  'players.getProfile',
  'players.getGameStats',
  'players.searchPlayers',
  'stores.list',
  'tournaments.getUpcoming',
  'tournaments.list',
  'tournaments.getById',
  'matches.getById',
  'matches.getByTournament',
  'leaderboards.getSeasonal',
  'leaderboards.getTopPlayers',
  'leaderboards.getFiltered',
  'leaderboards.getHistoricalSeasons',
  'leaderboards.getAvailableSeasons',
  'leaderboards.getSeasonalCached',
  'leaderboards.getPlayerTrends',
  'leaderboards.getRankingStats',
  'leaderboards.getPlayerDeckStats',
  'decks.list',
  'decks.getById',
  'decks.getStats',
  'decks.getUsage',
  'decks.getArchetypes',
  'tournamentEntries.getByTournament',
  'tournamentEntries.getByPlayer',
])

/**
 * Extract procedure paths from tRPC request URL
 * Handles both single procedures and batched requests
 */
function extractProcedurePaths(url: string): string[] {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    
    // Extract the procedure path(s) from /api/trpc/procedure1,procedure2
    const match = pathname.match(/\/api\/trpc\/(.+)$/)
    if (!match) return []
    
    const procedures = match[1]
    // Split by comma for batched requests
    return procedures.split(',')
  } catch {
    return []
  }
}

/**
 * Check if all procedures in a request are public
 */
function areAllProceduresPublic(procedurePaths: string[]): boolean {
  if (procedurePaths.length === 0) return false
  
  return procedurePaths.every(path => PUBLIC_PROCEDURE_PATHS.has(path))
}

// Create context for tRPC with enhanced error handling
export const createTRPCContext = async (opts?: {
  headers?: Headers;
  req?: Request;
}): Promise<TRPCContext> => {
  let user = undefined;
  let session = undefined;

  // Check if this is a public-only request to skip session validation
  const procedurePaths = opts?.req?.url ? extractProcedurePaths(opts.req.url) : []
  const isPublicOnly = areAllProceduresPublic(procedurePaths)

  // Only validate session if:
  // 1. Headers are provided
  // 2. Not all procedures are public (some might need auth)
  if (opts?.headers && !isPublicOnly) {
    try {
      // Use Better Auth's built-in session validation
      const sessionData = await auth.api.getSession({
        headers: opts.headers,
      });
      
      if (sessionData?.session && sessionData?.user) {
        session = sessionData.session;
        user = {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name || undefined,
          role: (sessionData.user as any).role || 'player',
        };
      }
    } catch (error) {
      // Silent fail - user is not authenticated, which is fine for public endpoints
      console.debug('No valid session found:', error);
    }
  }

  return {
    prisma,
    basePrisma: basePrismaClient,
    headers: opts?.headers || null,
    user,
    session,
  };
};

// Import router factory to avoid circular dependencies
import {
  router,
  publicProcedure,
  protectedProcedure,
  organizerProcedure,
  adminProcedure,
} from "./router-factory";

// Import routers here to avoid circular dependencies
import { leaderboardsRouter } from "./routers/leaderboards";
import { decksRouter } from "./routers/decks";
import { tournamentEntriesRouter } from "./routers/tournament-entries";
import { userPreferencesRouter } from "./routers/user-preferences";
import { tournamentLifecycleRouter } from "./routers/tournament-lifecycle";
import { matchManagementRouter } from "./routers/match-management";
import { invitationsRouter } from "./routers/invitations";
import { emailMetricsRouter } from "./routers/email-metrics";

// Main app router with basic structure
export const appRouter = router({
  // Health check endpoint
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }),

  // Basic auth router
  auth: router({
    /**
     * Resend verification email
     * 
     * Generates a new verification token and sends a verification email.
     * Always returns success for security (doesn't reveal if email exists).
     * Includes rate limiting to prevent abuse.
     * 
     * Requirements: 1.1, 4.3, 8.5
     */
    resendVerificationEmail: publicProcedure
      .input(
        z.object({
          email: z.string().email('Invalid email address'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { SUCCESS_MESSAGES } = await import('@/lib/email/error-messages');
        
        try {
          // Use Better Auth's built-in verification email resend method
          // This handles token generation, expiration, and calls our sendVerificationEmail callback
          const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const callbackURL = `${baseUrl}/verify-email`;
          
          await auth.api.sendVerificationEmail({
            body: {
              email: input.email,
              callbackURL: callbackURL,
            },
            headers: ctx.headers || new Headers(),
          });

          // Always return success message for security (doesn't reveal if email exists or is already verified)
          // Better Auth handles user existence and verification status checking internally
          logEmailOperation('resend_verification', 'verification', {
            email: input.email,
            success: true,
          });

          return {
            success: true,
            message: SUCCESS_MESSAGES.VERIFICATION_RESENT,
          };
        } catch (error) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }
          
          // Convert email errors to tRPC errors
          handleEmailError(error, 'verification');
        }
      }),

    /**
     * Verify email with token
     * 
     * Validates the verification token and marks the user's email as verified.
     * Automatically signs in the user after successful verification.
     * 
     * Requirements: 1.3, 1.5, 8.3, 8.4
     */
    verifyEmail: publicProcedure
      .input(
        z.object({
          token: z.string().min(1, 'Token is required'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { 
          SUCCESS_MESSAGES, 
          VERIFICATION_ERROR_MESSAGES 
        } = await import('@/lib/email/error-messages');
        
        try {
          // Use Better Auth's built-in email verification method
          // This handles token validation, expiration checking, user verification, token cleanup,
          // and triggers auto sign-in if configured (emailVerification.autoSignInAfterVerification)
          const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const callbackURL = `${baseUrl}/profile-completion`;
          
          const result = await auth.api.verifyEmail({
            query: {
              token: input.token,
              callbackURL: callbackURL,
            },
            headers: ctx.headers || new Headers(),
          });

          // Better Auth handles all the logic including:
          // - Token validation and expiration checking
          // - User lookup and verification status checking
          // - Marking email as verified
          // - Deleting the verification token
          // - Auto sign-in if configured (autoSignInAfterVerification)
          // - Triggering afterSignUp/afterSignIn callbacks

          logEmailOperation('verify_email', 'verification', {
            success: true,
          });

          // Check if email was already verified (Better Auth returns different response)
          const alreadyVerified = result === undefined || (typeof result === 'object' && !result.status);

          return {
            success: true,
            message: alreadyVerified 
              ? VERIFICATION_ERROR_MESSAGES.ALREADY_VERIFIED 
              : SUCCESS_MESSAGES.EMAIL_VERIFIED,
            alreadyVerified: alreadyVerified,
          };
        } catch (error: any) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }

          // Better Auth may return specific error messages
          const errorMessage = error?.message || error?.statusText || 'Failed to verify email';
          
          // Convert to tRPC error with appropriate code
          if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: VERIFICATION_ERROR_MESSAGES.TOKEN_INVALID,
            });
          }

          // Convert other email errors to tRPC errors
          handleEmailError(error, 'verification');
        }
      }),

    /**
     * Request password reset
     * 
     * Generates a password reset token and sends a reset email.
     * Always returns success for security (doesn't reveal if email exists).
     * Includes rate limiting to prevent abuse.
     * 
     * Requirements: 2.1, 2.2, 8.5
     */
    requestPasswordReset: publicProcedure
      .input(
        z.object({
          email: z.string().email('Invalid email address'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { SUCCESS_MESSAGES } = await import('@/lib/email/error-messages');
        
        try {
          // Use Better Auth's built-in password reset request method
          // This handles token generation, expiration, and calls our sendResetPassword callback
          const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const resetUrl = `${baseUrl}/reset-password`;
          
          await auth.api.requestPasswordReset({
            body: {
              email: input.email,
              redirectTo: resetUrl,
            },
            headers: ctx.headers || new Headers(),
          });

          // Always return success message for security (doesn't reveal if email exists)
          // Better Auth handles user existence checking internally
          logEmailOperation('request_password_reset', 'password_reset', {
            email: input.email,
            success: true,
          });

          return {
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT,
          };
        } catch (error) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }
          
          // Convert email errors to tRPC errors
          handleEmailError(error, 'password_reset');
        }
      }),

    /**
     * Reset password with token
     * 
     * Validates the reset token and updates the user's password.
     * Invalidates all existing sessions for security.
     * Triggers the onPasswordReset callback.
     * 
     * Requirements: 2.3, 2.4, 2.6, 8.3, 8.4
     */
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(1, 'Token is required'),
          password: z.string().min(8, 'Password must be at least 8 characters long'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { 
          SUCCESS_MESSAGES, 
          PASSWORD_RESET_ERROR_MESSAGES 
        } = await import('@/lib/email/error-messages');
        
        try {
          // Use Better Auth's built-in password reset method
          // This handles token validation, password hashing, session invalidation, and triggers callbacks
          await auth.api.resetPassword({
            body: {
              newPassword: input.password,
              token: input.token,
            },
            query: {
              token: input.token,
            },
            headers: ctx.headers || new Headers(),
          });

          // Better Auth handles all the logic including:
          // - Token validation and expiration checking
          // - Password hashing (using correct algorithm)
          // - Updating account password
          // - Invalidating all user sessions
          // - Deleting the reset token
          // - Triggering onPasswordReset callback

          logEmailOperation('reset_password', 'password_reset', {
            success: true,
          });

          return {
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
          };
        } catch (error: any) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }

          // Better Auth may return specific error messages
          const errorMessage = error?.message || error?.statusText || 'Failed to reset password';
          
          // Convert to tRPC error with appropriate code
          if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: PASSWORD_RESET_ERROR_MESSAGES.TOKEN_INVALID,
            });
          }

          // Convert other email errors to tRPC errors
          handleEmailError(error, 'password_reset');
        }
      }),

    /**
     * Send role invitation
     * 
     * Creates a role invitation and sends an invitation email.
     * Only admins can send invitations.
     * Validates that the user exists and doesn't already have the role.
     * Prevents duplicate pending invitations.
     * 
     * Requirements: 3.1, 3.2, 6.1, 6.2, 6.3
     */
    sendRoleInvitation: adminProcedure
      .input(
        z.object({
          email: z.string().email('Invalid email address'),
          role: z.enum(['organizer', 'admin']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { 
          SUCCESS_MESSAGES, 
          INVITATION_ERROR_MESSAGES 
        } = await import('@/lib/email/error-messages');
        
        try {
          const { email, role } = input;
          const inviterId = ctx.user!.id;

          // Check if user with this email exists
          const existingUser = await ctx.prisma.user.findUnique({
            where: { email },
            select: { 
              id: true, 
              role: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          });

          if (!existingUser) {
            logEmailOperation('send_role_invitation', 'invitation', {
              email,
              role,
              error: 'user_not_found',
            });
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: INVITATION_ERROR_MESSAGES.USER_NOT_FOUND,
            });
          }

          // Check if user already has this role or higher
          const roleHierarchy: Record<string, number> = { player: 0, organizer: 1, admin: 2 };
          const currentRoleLevel = roleHierarchy[existingUser.role] || 0;
          const targetRoleLevel = roleHierarchy[role];

          if (currentRoleLevel >= targetRoleLevel) {
            logEmailOperation('send_role_invitation', 'invitation', {
              email,
              role,
              currentRole: existingUser.role,
              error: 'already_has_role',
            });
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: INVITATION_ERROR_MESSAGES.ALREADY_HAS_ROLE,
            });
          }

          // Check for existing pending invitation
          const existingInvitation = await ctx.prisma.roleInvitation.findFirst({
            where: {
              email,
              role,
              acceptedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
          });

          if (existingInvitation) {
            logEmailOperation('send_role_invitation', 'invitation', {
              email,
              role,
              error: 'duplicate_invitation',
            });
            throw new TRPCError({
              code: 'CONFLICT',
              message: INVITATION_ERROR_MESSAGES.DUPLICATE_INVITATION,
            });
          }

          // Generate secure token
          const crypto = await import('crypto');
          const token = crypto.randomBytes(32).toString('hex');

          // Create invitation (expires in 7 days)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const invitation = await ctx.prisma.roleInvitation.create({
            data: {
              email,
              role,
              token,
              invitedById: inviterId,
              expiresAt,
            },
            include: {
              invitedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          // Send invitation email
          const { sendRoleInvitationEmail } = await import('@/lib/email');
          const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

          // Get inviter display name
          const inviterName = invitation.invitedBy.firstName && invitation.invitedBy.lastName
            ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
            : invitation.invitedBy.name || invitation.invitedBy.email;

          await sendRoleInvitationEmail({
            email,
            role,
            invitedBy: {
              name: inviterName,
              email: invitation.invitedBy.email,
            },
            url: invitationUrl,
            token,
          });

          logEmailOperation('send_role_invitation', 'invitation', {
            email,
            role,
            invitedBy: inviterName,
            success: true,
          });

          return {
            success: true,
            message: SUCCESS_MESSAGES.INVITATION_SENT,
            invitation: {
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              expiresAt: invitation.expiresAt,
              createdAt: invitation.createdAt,
            },
          };
        } catch (error) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }
          
          // Convert email errors to tRPC errors
          handleEmailError(error, 'invitation');
        }
      }),

    /**
     * Get role invitation details
     * 
     * Fetches invitation details by token.
     * Public endpoint - anyone with the token can view details.
     * Returns invitation status (expired, accepted, valid).
     * 
     * Requirements: 3.3, 6.4
     */
    getRoleInvitation: publicProcedure
      .input(
        z.object({
          token: z.string().min(1, 'Token is required'),
        })
      )
      .query(async ({ ctx, input }) => {
        const { handleEmailError } = await import('@/lib/email/error-handler');
        const { INVITATION_ERROR_MESSAGES } = await import('@/lib/email/error-messages');
        
        try {
          const { token } = input;

          // Find invitation by token
          const invitation = await ctx.prisma.roleInvitation.findUnique({
            where: { token },
            include: {
              invitedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (!invitation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: INVITATION_ERROR_MESSAGES.TOKEN_INVALID,
            });
          }

          // Check invitation status
          const isExpired = invitation.expiresAt < new Date();
          const isAccepted = invitation.acceptedAt !== null;

          // Get inviter display name
          const inviterName = invitation.invitedBy.firstName && invitation.invitedBy.lastName
            ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
            : invitation.invitedBy.name || invitation.invitedBy.email;

          return {
            success: true,
            invitation: {
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              invitedBy: {
                name: inviterName,
                email: invitation.invitedBy.email,
              },
              expiresAt: invitation.expiresAt,
              createdAt: invitation.createdAt,
              isExpired,
              isAccepted,
            },
          };
        } catch (error) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }
          
          // Convert email errors to tRPC errors
          handleEmailError(error, 'invitation');
        }
      }),

    /**
     * Accept role invitation
     * 
     * Validates the invitation token and upgrades the user's role.
     * Requires authentication - user must be signed in.
     * Validates that the invitation email matches the signed-in user's email.
     * Updates user role and marks invitation as accepted in a transaction.
     * Updates the user session to reflect the new role.
     * 
     * Requirements: 3.4, 3.5, 8.3, 8.4
     */
    acceptRoleInvitation: protectedProcedure
      .input(
        z.object({
          token: z.string().min(1, 'Token is required'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { 
          handleEmailError, 
          logEmailOperation 
        } = await import('@/lib/email/error-handler');
        const { TokenError } = await import('@/lib/email/errors');
        const { 
          SUCCESS_MESSAGES, 
          INVITATION_ERROR_MESSAGES 
        } = await import('@/lib/email/error-messages');
        
        try {
          const { token } = input;
          const userId = ctx.user!.id;

          // Find invitation
          const invitation = await ctx.prisma.roleInvitation.findUnique({
            where: { token },
            include: {
              invitedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (!invitation) {
            throw new TokenError(
              INVITATION_ERROR_MESSAGES.TOKEN_INVALID,
              'INVALID'
            );
          }

          // Check if already accepted
          if (invitation.acceptedAt) {
            throw new TokenError(
              INVITATION_ERROR_MESSAGES.TOKEN_ALREADY_USED,
              'ALREADY_USED'
            );
          }

          // Check if expired
          if (invitation.expiresAt < new Date()) {
            throw new TokenError(
              INVITATION_ERROR_MESSAGES.TOKEN_EXPIRED,
              'EXPIRED'
            );
          }

          // Get current user
          const user = await ctx.prisma.user.findUnique({
            where: { id: userId },
            select: { 
              email: true, 
              role: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          });

          if (!user) {
            logEmailOperation('accept_role_invitation', 'invitation', {
              token: token.substring(0, 8) + '...',
              error: 'user_not_found',
            });
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: INVITATION_ERROR_MESSAGES.USER_NOT_FOUND,
            });
          }

          // Verify email matches
          if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            logEmailOperation('accept_role_invitation', 'invitation', {
              userEmail: user.email,
              invitationEmail: invitation.email,
              error: 'email_mismatch',
            });
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: INVITATION_ERROR_MESSAGES.USER_MISMATCH,
            });
          }

          // Check if user already has this role or higher
          const roleHierarchy: Record<string, number> = { player: 0, organizer: 1, admin: 2 };
          const currentRoleLevel = roleHierarchy[user.role] || 0;
          const targetRoleLevel = roleHierarchy[invitation.role];

          if (currentRoleLevel >= targetRoleLevel) {
            // Mark as accepted even if role is already sufficient
            await ctx.prisma.roleInvitation.update({
              where: { id: invitation.id },
              data: { acceptedAt: new Date() },
            });

            logEmailOperation('accept_role_invitation', 'invitation', {
              email: user.email,
              role: invitation.role,
              alreadyHasRole: true,
            });

            return {
              success: true,
              message: INVITATION_ERROR_MESSAGES.ALREADY_HAS_ROLE,
              role: user.role,
            };
          }

          // Update user role and mark invitation as accepted in a transaction
          await ctx.prisma.$transaction([
            ctx.prisma.user.update({
              where: { id: userId },
              data: { role: invitation.role },
            }),
            ctx.prisma.roleInvitation.update({
              where: { id: invitation.id },
              data: { acceptedAt: new Date() },
            }),
          ]);

          logEmailOperation('accept_role_invitation', 'invitation', {
            email: user.email,
            role: invitation.role,
            success: true,
          });

          // Note: Session update is handled by Better Auth automatically on next request
          // The client should refresh the session or redirect to trigger the update

          return {
            success: true,
            message: SUCCESS_MESSAGES.INVITATION_ACCEPTED,
            role: invitation.role,
          };
        } catch (error) {
          // Handle errors with proper conversion to tRPC errors
          if (error instanceof TRPCError) {
            throw error;
          }
          
          // Convert email errors to tRPC errors
          handleEmailError(error, 'invitation');
        }
      }),

    /**
     * List role invitations
     * 
     * Lists all role invitations (admin only).
     * Useful for displaying invitation status in admin UI.
     * 
     * Requirements: 6.1, 6.2
     */
    listRoleInvitations: adminProcedure.query(async ({ ctx }) => {
      try {
        const invitations = await ctx.prisma.roleInvitation.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            invitedBy: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return invitations.map((invitation) => {
          const inviterName = invitation.invitedBy.firstName && invitation.invitedBy.lastName
            ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
            : invitation.invitedBy.name || invitation.invitedBy.email;

          return {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            invitedBy: {
              name: inviterName,
              email: invitation.invitedBy.email,
            },
            acceptedAt: invitation.acceptedAt,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt,
            isExpired: invitation.expiresAt < new Date(),
            isAccepted: invitation.acceptedAt !== null,
          };
        });
      } catch (error) {
        console.error('[AUTH] Error listing role invitations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching invitations.',
        });
      }
    }),
  }),

  // User profile router
  user: router({
    // Update user profile (authenticated users only)
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255).optional(), // @deprecated - use firstName and lastName instead
          firstName: z.string().min(1).max(100).optional(),
          lastName: z.string().min(1).max(100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        const updatedUser = await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: input,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          success: true,
          message: "Profile updated successfully",
          user: updatedUser,
        };
      }),

    // Get current user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

    // Ensure Player record exists for current user (backup for auth callback failures)
    ensurePlayerExists: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Check if player already exists
      const existingPlayer = await ctx.prisma.player.findUnique({
        where: { userId: ctx.user.id },
      });

      if (existingPlayer) {
        return {
          success: true,
          message: "Player record already exists",
          playerId: existingPlayer.id,
        };
      }

      // Create player record
      try {
        const player = await ctx.prisma.player.create({
          data: {
            userId: ctx.user.id,
          },
        });

        console.log(`🔧 [BACKUP] Created Player record for user ${ctx.user.id}`, player.id);

        return {
          success: true,
          message: "Player record created successfully",
          playerId: player.id,
        };
      } catch (error) {
        console.error("🔧 [BACKUP] Error creating Player record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create player record",
        });
      }
    }),

    // List all users (admin only)
    list: adminProcedure.query(async ({ ctx }) => {
      try {
        const users = await ctx.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return users;
      } catch (error) {
        console.error('[USER] Error listing users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching users.',
        });
      }
    }),
  }),

  // Enhanced games router
  games: router({
    // List all available games (public)
    list: publicProcedure
      .input(
        z.object({
          includeInactive: z.boolean().default(false),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where = input.includeInactive ? {} : { isActive: true };

        const dbGames = await ctx.prisma.game.findMany({
          where,
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                tournaments: true,
                playerGameStats: true,
              },
            },
          },
        });

        // Get game logic from registry
        const activeGames = getActiveGamesAsJSON();
        
        // Combine database info with game logic
        return dbGames.map((game) => {
          const gameLogic = activeGames.find(g => g.id === game.id);
          return {
            id: game.id,
            name: game.name,
            shortName: game.shortName,
            formats: gameLogic?.formats || [],
            isActive: game.isActive,
            metadata: gameLogic?.metadata || {},
            tournamentCount: game._count.tournaments,
            playerCount: game._count.playerGameStats,
          };
        });
      }),

    // Get specific game details (public)
    getById: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
          include: {
            _count: {
              select: {
                tournaments: true,
                playerGameStats: true,
              },
            },
          },
        });

        if (!game) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        // Get game logic from registry
        const gameLogic = getActiveGamesAsJSON().find(g => g.id === game.id);

        return {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          formats: gameLogic?.formats || [],
          isActive: game.isActive,
          metadata: gameLogic?.metadata || {},
          tournamentCount: game._count.tournaments,
          playerCount: game._count.playerGameStats,
        };
      }),

    // Create a new game (admin only)
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          shortName: z.string().min(1).max(10),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Check if game with same name already exists
        const existingGame = await ctx.prisma.game.findFirst({
          where: { name: input.name },
        });

        if (existingGame) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A game with this name already exists",
          });
        }

        // Check if a game class exists for this game
        try {
          getGameOrThrow(input.shortName.toLowerCase().replace(/\s+/g, '-'));
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `No game class found for '${input.name}'. Please implement the game class first.`,
          });
        }

        const game = await ctx.prisma.game.create({
          data: {
            name: input.name,
            shortName: input.shortName,
            isActive: true,
          },
        });

        return game;
      }),

    // Update game (admin only)
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          shortName: z.string().min(1).max(10).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify game exists
        const existingGame = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        });

        if (!existingGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        const { id, ...updateData } = input;
        const updatedGame = await ctx.prisma.game.update({
          where: { id },
          data: updateData,
        });

        return updatedGame;
      }),

    // Toggle game active status (admin only)
    toggleActive: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        });

        if (!game) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        const updatedGame = await ctx.prisma.game.update({
          where: { id: input.id },
          data: { isActive: !game.isActive },
        });

        return updatedGame;
      }),

    // Get game statistics (public)
    getStats: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        });

        if (!game) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        // Get comprehensive statistics
        const [
          totalPlayers,
          totalTournaments,
          activeTournaments,
          completedTournaments,
          topPlayers,
        ] = await Promise.all([
          ctx.prisma.playerGameStats.count({
            where: { gameId: input.id },
          }),
          ctx.prisma.tournament.count({
            where: { gameId: input.id },
          }),
          ctx.prisma.tournament.count({
            where: {
              gameId: input.id,
              status: { in: ["UPCOMING", "ACTIVE"] },
            },
          }),
          ctx.prisma.tournament.count({
            where: {
              gameId: input.id,
              status: "COMPLETED",
            },
          }),
          ctx.prisma.playerGameStats.findMany({
            where: { gameId: input.id },
            include: {
              player: {
                select: {
                  id: true,
                  user: { select: userPublicSelectWithPrefs },
                },
              },
            },
            orderBy: { currentRating: "desc" },
            take: 10,
          }),
        ]);

        return {
          game,
          stats: {
            totalPlayers,
            totalTournaments,
            activeTournaments,
            completedTournaments,
            topPlayers: topPlayers.map((stat) => ({
              playerId: stat.playerId,
              displayName: getPublicDisplayName(stat.player.user),
              rating: stat.currentRating,
              seasonalStats: stat.seasonalStats,
            })),
          },
        };
      }),
  }),

  // Enhanced players router
  players: router({
    // Get player profile (requires authentication for own profile, public for others)
    getProfile: publicProcedure
      .input(
        z.object({
          playerId: z.string().uuid().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const targetPlayerId = input.playerId;

        // If no playerId provided, this would get current user's profile (requires auth)
        // For now, we'll return a placeholder since auth is not fully implemented
        if (!targetPlayerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Player ID is required. Authentication will be implemented in later tasks.",
          });
        }

        const player = await ctx.prisma.player.findUnique({
          where: { id: targetPlayerId },
          include: {
            gameStats: {
              include: {
                game: true,
              },
              orderBy: { currentRating: "desc" },
            },
            user: { select: { email: true, ...userPublicSelectWithPrefs } },
          },
        });

        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player not found",
          });
        }

        // Check privacy settings (simplified for now)
        const isPublic = player.user.userPreferences?.profileVisibility === "PUBLIC";

        if (!isPublic) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This player profile is private",
          });
        }

        // Filter sensitive data for public profiles
        const profileData = {
          ...player,
          user: {
            name: player.user.name,
            firstName: player.user.firstName,
            lastName: player.user.lastName,
            role: player.user.role,
            // Hide email for public profiles
          },
          // Hide external player IDs for public profiles
          externalPlayerIds: undefined,
        };

        return profileData;
      }),

    // Update player profile (authenticated users only, own profile)
    updateProfile: protectedProcedure
      .input(
        z.object({
          externalPlayerIds: z.record(z.string().uuid(), z.string()).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .mutation(async () => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message:
            "Profile updates will be implemented once authentication is fully set up",
        });
      }),

    // Get game-specific statistics for a player
    getGameStats: publicProcedure
      .input(
        z.object({
          playerId: z.string().uuid().optional(),
          gameId: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const targetPlayerId = input.playerId;

        // If no playerId provided, this would get current user's stats (requires auth)
        if (!targetPlayerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Player ID is required. Authentication will be implemented in later tasks.",
          });
        }

        // Verify game exists
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.gameId },
        });

        if (!game) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        // Get player and check privacy
        const player = await ctx.prisma.player.findUnique({
          where: { id: targetPlayerId },
          include: {
            user: { select: userPublicSelectWithPrefs },
          },
        });

        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player not found",
          });
        }

        const isPublic = player.user?.userPreferences?.profileVisibility === "PUBLIC";

        if (!isPublic) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This player profile is private",
          });
        }

        // Get game stats
        const gameStats = await ctx.prisma.playerGameStats.findUnique({
          where: {
            playerId_gameId: {
              playerId: targetPlayerId,
              gameId: input.gameId,
            },
          },
          include: {
            game: true,
            player: {
              select: {
                user: { select: userPublicSelectWithPrefs },
              },
            },
          },
        });

        if (!gameStats) {
          // Return default stats if player hasn't played this game
          return {
            playerId: targetPlayerId,
            gameId: input.gameId,
            game,
            currentRating: 1200,
            seasonalStats: {
              wins: 0,
              losses: 0,
              tournaments: 0,
              points: 0,
            },
            bestFinish: null,
            totalEarnings: 0,
            metadata: null,
          };
        }

        return gameStats;
      }),

    // Search for players
    searchPlayers: publicProcedure
      .input(
        z.object({
          query: z.string().min(1).max(100),
          gameId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(50).default(10),
        }),
      )
      .query(async ({ ctx, input }) => {
        const whereClause: Record<string, unknown> = {
          user: {
            userPreferences: {
              profileVisibility: "PUBLIC",
            },
            OR: [
              {
                name: {
                  contains: input.query,
                  mode: "insensitive",
                },
              },
              {
                firstName: {
                  contains: input.query,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: input.query,
                  mode: "insensitive",
                },
              },
            ],
          },
        };

        // Filter by game if specified
        if (input.gameId) {
          whereClause.gameStats = {
            some: {
              gameId: input.gameId,
            },
          };
        }

        const players = await ctx.prisma.player.findMany({
          where: whereClause,
          include: {
            user: { select: userPublicSelectMinimal },
            gameStats: input.gameId
              ? {
                  where: { gameId: input.gameId },
                  include: { game: true },
                }
              : {
                  include: { game: true },
                  orderBy: { currentRating: "desc" },
                  take: 3, // Show top 3 games for general search
                },
          },
          orderBy: {
            gameStats: input.gameId
              ? {
                  _count: "desc",
                }
              : undefined,
          },
          take: input.limit,
        });

        return players.map((player) => ({
          id: player.id,
          displayName: getDisplayName(player.user),
          userName: player.user.name,
          role: player.user.role,
          gameStats: player.gameStats,
          createdAt: player.createdAt,
        }));
      }),

    // Manage external player IDs (authenticated users only)
    setExternalPlayerId: protectedProcedure
      .input(
        z.object({
          gameId: z.string().uuid(),
          externalId: z.string().min(1).max(50),
        }),
      )
      .mutation(async () => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message:
            "External player ID management will be implemented once authentication is fully set up",
        });
      }),

    // Remove external player ID (authenticated users only)
    removeExternalPlayerId: protectedProcedure
      .input(
        z.object({
          gameId: z.string().uuid(),
        }),
      )
      .mutation(async () => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message:
            "External player ID management will be implemented once authentication is fully set up",
        });
      }),
  }),

  // Enhanced tournaments router
  tournaments: router({
    // List tournaments with comprehensive filtering
    list: publicProcedure
      .input(TournamentListQuerySchema)
      .query(async ({ ctx, input }): Promise<ApiTournamentListResponse> => {
        const where: Record<string, unknown> = {};

        // Filter by game if specified
        if (input.gameId) {
          where.gameId = input.gameId;
        }

        // Filter by store if specified
        if (input.storeId) {
          where.storeId = input.storeId;
        }

        // Filter by organizer if specified
        if (input.organizerId) {
          where.organizerId = input.organizerId;
        }

        // Filter by status if specified
        if (input.status) {
          where.status = input.status;
        }

        // Filter by date range if specified
        if (input.startDate || input.endDate) {
          where.date = {} as DateFilterClause;
          if (input.startDate) {
            (where.date as DateFilterClause).gte = input.startDate;
          }
          if (input.endDate) {
            (where.date as DateFilterClause).lte = input.endDate;
          }
        }

        const [tournaments, total] = await Promise.all([
          ctx.prisma.tournament.findMany({
            where,
            orderBy: { date: "desc" },
            take: input.limit,
            skip: input.offset,
            include: {
              game: {
                select: {
                  id: true,
                  name: true,
                  shortName: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                  address: true,
                  contactEmail: true,
                  website: true,
                },
              },
              organizer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  matches: true,
                  entries: true,
                },
              },
            },
          }),
          ctx.prisma.tournament.count({ where }),
        ]);

        return {
          tournaments: tournaments.map((tournament) => ({
            ...tournament,
            matchCount: tournament._count.matches,
            entryCount: tournament._count.entries,
          })),
          total,
          hasMore: input.offset + input.limit < total,
        };
      }),

    // Get tournament details by ID
    getById: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          includeMatches: z.boolean().default(false),
          includeParticipants: z.boolean().default(false),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.id },
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            matches: input.includeMatches
              ? {
                  include: {
                    player1: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            name: true,
                            firstName: true,
                            lastName: true,
                            userPreferences: {
                              select: {
                                profileVisibility: true,
                              },
                            },
                          },
                        },
                      },
                    },
                    player2: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            name: true,
                            firstName: true,
                            lastName: true,
                            userPreferences: {
                              select: {
                                profileVisibility: true,
                              },
                            },
                          },
                        },
                      },
                    },
                    winner: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            name: true,
                            firstName: true,
                            lastName: true,
                            userPreferences: {
                              select: {
                                profileVisibility: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  orderBy: [{ round: "asc" }, { table: "asc" }],
                }
              : undefined,
            entries: input.includeParticipants
              ? {
                  include: {
                    player: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            name: true,
                            firstName: true,
                            lastName: true,
                            userPreferences: {
                              select: {
                                profileVisibility: true,
                              },
                            },
                          },
                        },
                      },
                    },
                    deck: {
                      select: {
                        id: true,
                        name: true,
                        archetype: true,
                        format: true,
                      },
                    },
                  },
                  orderBy: [
                    { seed: "asc" },
                    { placement: "asc" },
                    { player: { user: { name: "asc" } } },
                  ],
                }
              : undefined,
            _count: {
              select: {
                matches: true,
                entries: true,
              },
            },
          },
        });

        if (!tournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Import calculation utilities
        const {
          calculateTournamentData,
          calculateParticipantData,
          formatTournamentDate,
          formatTournamentTime,
          isRegistrationOpen,
          getTimeUntilDeadline,
        } = await import("@/lib/utils/tournament-calculations");

        // Calculate tournament-level data
        const tournamentCalculations = calculateTournamentData(
          tournament,
          tournament.matches || [],
          tournament.entries || []
        );

        // Process participants with calculated data if requested
        let processedParticipants: Array<{
          id: string;
          displayName: string;
          username?: string;
          isPublic: boolean;
          seed?: number;
          wins: number;
          losses: number;
          status: 'active' | 'eliminated' | 'bye' | 'dropped';
          tier: 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';
          rating: number;
          registrationDate: Date;
          deck?: {
            id: string;
            name: string;
            archetype: string;
            format: string;
          } | null;
        }> = [];

        if (input.includeParticipants && tournament.entries) {
          // Get player game stats for rating calculations
          const playerIds = tournament.entries.map(entry => entry.playerId);
          const playerGameStats = await ctx.prisma.playerGameStats.findMany({
            where: {
              playerId: { in: playerIds },
              gameId: tournament.gameId,
            },
            select: {
              playerId: true,
              currentRating: true,
            },
          });

          const ratingMap = new Map(
            playerGameStats.map(stat => [stat.playerId, stat.currentRating])
          );

          processedParticipants = await Promise.all(
            tournament.entries.map(async (entry: any) => {
              const rating = ratingMap.get(entry.playerId) || 1200;
              const participantCalculations = calculateParticipantData(
                entry.playerId,
                tournament,
                tournament.matches || [],
                entry,
                rating
              );

              return {
                id: (entry as any).player?.id,
                displayName: getPublicDisplayName((entry as any).player?.user),
                isPublic: (entry as any).player?.user?.userPreferences?.profileVisibility === "PUBLIC",
                seed: entry.seed || undefined,
                wins: participantCalculations.wins,
                losses: participantCalculations.losses,
                status: participantCalculations.status,
                tier: participantCalculations.tier,
                rating,
                registrationDate: entry.registrationDate,
                deck: (entry as any).deck && (entry as any).player?.user?.userPreferences?.profileVisibility === "PUBLIC"
                  ? (entry as any).deck
                  : null,
              };
            })
          );
        }

        // Process matches if included
        let processedMatches:
          | Array<{
              [key: string]: unknown;
              player1: { displayName: string; [key: string]: unknown };
              player2: { displayName: string; [key: string]: unknown };
              winner: { displayName: string; [key: string]: unknown } | null;
            }>
          | undefined = undefined;
        if (input.includeMatches && tournament.matches) {
          processedMatches = tournament.matches.map((match: any) => ({
            ...match,
            player1: {
              ...match.player1,
              displayName: getPublicDisplayName(match.player1?.user),
            },
            player2: {
              ...match.player2,
              displayName: getPublicDisplayName(match.player2?.user),
            },
            winner: match.winner
              ? {
                  ...match.winner,
                  displayName: getPublicDisplayName(match.winner?.user),
                }
              : null,
          }));
        }

        return {
          ...tournament,
          // Add calculated fields
          currentRound: tournamentCalculations.currentRound,
          completionPercentage: tournamentCalculations.completionPercentage,
          isLive: tournamentCalculations.isLive,
          participantCount: tournamentCalculations.participantCount,
          registrationProgress: tournamentCalculations.registrationProgress,
          // Add formatted dates
          formattedDate: formatTournamentDate(tournament.date),
          formattedTime: formatTournamentTime(tournament.date),
          // Add registration status
          registrationOpen: isRegistrationOpen(tournament),
          timeUntilDeadline: getTimeUntilDeadline(tournament),
          // Add counts
          matchCount: tournament._count.matches,
          entryCount: tournament._count.entries,
          // Add processed data
          participants: input.includeParticipants ? processedParticipants : undefined,
          matches: processedMatches,
        };
      }),

    // Register for a tournament
    register: protectedProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
          deckId: z.string().uuid().optional(),
          firstName: z.string().min(1).max(100).optional(),
          lastName: z.string().min(1).max(100).optional(),
          deckArchetype: z.string().min(1).optional(),
          deckList: z.string().optional(),
          shareDeckList: z.boolean().optional(),
          agreesToConduct: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get current user's player record, create if it doesn't exist
        let player = await ctx.prisma.player.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!player) {
          // Defensive creation: Create player record if it doesn't exist
          // This can happen if the auth callback failed or there was a race condition
          try {
            player = await ctx.prisma.player.create({
              data: {
                userId: ctx.user.id,
              },
            });
            console.log(`Created missing Player record for user ${ctx.user.id} during tournament registration`);
          } catch (error) {
            console.error("Error creating Player record during tournament registration:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create player profile. Please try again.",
            });
          }
        }

        // Verify tournament exists and is open for registration
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: {
            game: true,
            entries: {
              where: { playerId: player.id },
            },
          },
        });

        if (!tournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Check if already registered
        if (tournament.entries.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You are already registered for this tournament",
          });
        }

        // Check tournament status
        if (tournament.status !== "UPCOMING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Registration is only available for upcoming tournaments",
          });
        }

        // Check registration deadline
        if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Registration deadline has passed",
          });
        }

        // Check if tournament is full
        if (tournament.maxPlayers) {
          const currentEntries = await ctx.prisma.tournamentEntry.count({
            where: { tournamentId: input.tournamentId },
          });

          if (currentEntries >= tournament.maxPlayers) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Tournament is full",
            });
          }
        }

        // Validate code of conduct agreement
        if (input.agreesToConduct !== true) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must agree to the code of conduct to register",
          });
        }

        let deckId = input.deckId;

        // Verify deck if provided via deckId
        if (input.deckId) {
          const deck = await ctx.prisma.deck.findUnique({
            where: { id: input.deckId },
          });

          if (!deck) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Deck not found",
            });
          }

          if (deck.gameId !== tournament.gameId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Deck game does not match tournament game",
            });
          }

          if (deck.format !== tournament.format) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Deck format does not match tournament format",
            });
          }
        } else if (input.deckArchetype) {
          // Check if deck archetype already exists for this game/format
          const deckName = `${input.deckArchetype} Deck`;
          let deck = await ctx.prisma.deck.findFirst({
            where: {
              name: deckName,
              gameId: tournament.gameId,
              format: tournament.format,
            },
          });

          // Create deck only if it doesn't exist (shared archetype)
          if (!deck) {
            deck = await ctx.prisma.deck.create({
              data: {
                name: deckName,
                archetype: input.deckArchetype,
                gameId: tournament.gameId,
                format: tournament.format,
                // No description - deck lists are stored per-entry in metadata
                description: null,
                metadata: {},
              },
            });
          }
          deckId = deck.id;
        }

        // Update user's firstName and lastName if provided
        console.log("Tournament registration input:", input);
        if (input.firstName || input.lastName) {
          console.log("Updating user with firstName:", input.firstName, "lastName:", input.lastName);
          await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data: {
              ...(input.firstName && { firstName: input.firstName }),
              ...(input.lastName && { lastName: input.lastName }),
            },
          });
          console.log("User updated successfully");
        } else {
          console.log("No firstName or lastName provided, skipping user update");
        }

        // Create tournament entry with deck list in metadata
        const entry = await ctx.prisma.tournamentEntry.create({
          data: {
            tournamentId: input.tournamentId,
            playerId: player.id,
            deckId: deckId,
            registrationDate: new Date(),
            metadata: {
              deckList: input.deckList || null,
              shareDeckList: input.shareDeckList || false,
            },
          },
          include: {
            tournament: {
              select: {
                name: true,
                date: true,
                format: true,
              },
            },
            player: {
              select: {
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            deck: deckId ? {
              select: {
                name: true,
                archetype: true,
              },
            } : false,
          },
        });

        return {
          success: true,
          message: "Successfully registered for tournament",
          entry,
        };
      }),

    // Unregister from a tournament
    unregister: protectedProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get current user's player record
        const player = await ctx.prisma.player.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player profile not found",
          });
        }

        // Verify tournament exists
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
        });

        if (!tournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Check if registered
        const entry = await ctx.prisma.tournamentEntry.findUnique({
          where: {
            tournamentId_playerId: {
              tournamentId: input.tournamentId,
              playerId: player.id,
            },
          },
        });

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "You are not registered for this tournament",
          });
        }

        // Check if tournament has started
        if (tournament.status === "ACTIVE" || tournament.status === "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot unregister from active or completed tournaments",
          });
        }

        // Delete tournament entry
        await ctx.prisma.tournamentEntry.delete({
          where: { id: entry.id },
        });

        return {
          success: true,
          message: "Successfully unregistered from tournament",
        };
      }),

    // Get registration status for a tournament
    getRegistrationStatus: protectedProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get current user's player record
        const player = await ctx.prisma.player.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!player) {
          return {
            isRegistered: false,
            canRegister: false,
            reason: "Player profile not found",
            entry: null,
          };
        }

        // Verify tournament exists
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: {
            entries: {
              where: { playerId: player.id },
              include: {
                deck: {
                  select: {
                    id: true,
                    name: true,
                    archetype: true,
                  },
                },
              },
            },
            _count: {
              select: {
                entries: true,
              },
            },
          },
        });

        if (!tournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        const isRegistered = tournament.entries.length > 0;
        const entry = isRegistered ? tournament.entries[0] : null;

        // Determine if user can register
        let canRegister = false;
        let reason = "";

        if (isRegistered) {
          reason = "Already registered";
        } else if (tournament.status !== "UPCOMING") {
          reason = "Tournament is not upcoming";
        } else if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
          reason = "Registration deadline has passed";
        } else if (tournament.maxPlayers && tournament._count.entries >= tournament.maxPlayers) {
          reason = "Tournament is full";
        } else {
          canRegister = true;
        }

        return {
          isRegistered,
          canRegister,
          reason: canRegister ? null : reason,
          entry,
          tournament: {
            id: tournament.id,
            name: tournament.name,
            status: tournament.status,
            maxPlayers: tournament.maxPlayers,
            currentPlayers: tournament._count.entries,
            registrationDeadline: tournament.registrationDeadline,
          },
        };
      }),

    // Create a new tournament (organizers and admins only)
    create: organizerProcedure
      .input(CreateTournamentSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify game exists and is active
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.gameId },
        });

        if (!game) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found",
          });
        }

        if (!game.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot create tournament for inactive game",
          });
        }

        // Verify store exists and is active
        const store = await ctx.prisma.store.findUnique({
          where: { id: input.storeId },
        });

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found",
          });
        }

        if (!store.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot create tournament for inactive store",
          });
        }

        // Verify organizer exists (this should be the current user)
        const organizer = await ctx.prisma.user.findUnique({
          where: { id: input.organizerId },
        });

        if (!organizer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organizer not found",
          });
        }

        // Validate tournament date is not in the past (unless it's being created as completed)
        if (input.status !== "COMPLETED" && input.date < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Tournament date cannot be in the past for upcoming or active tournaments",
          });
        }

        // Validate metadata if provided
        if (input.metadata) {
          try {
            JSON.stringify(input.metadata);
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid metadata format",
            });
          }
        }

        // Check for duplicate tournaments (same name, store, and date)
        const existingTournament = await ctx.prisma.tournament.findFirst({
          where: {
            name: input.name,
            storeId: input.storeId,
            date: {
              gte: new Date(
                input.date.getFullYear(),
                input.date.getMonth(),
                input.date.getDate(),
              ),
              lt: new Date(
                input.date.getFullYear(),
                input.date.getMonth(),
                input.date.getDate() + 1,
              ),
            },
          },
        });

        if (existingTournament) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A tournament with the same name already exists at this store on this date",
          });
        }

        const tournament = await ctx.prisma.tournament.create({
          data: input,
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return tournament;
      }),

    // Update tournament status (organizers and admins only)
    updateStatus: organizerProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify tournament exists
        const existingTournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.id },
          include: {
            organizer: true,
          },
        });

        if (!existingTournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Check if the current user is the organizer of this tournament or an admin
        if (ctx.user!.id !== existingTournament.organizerId && ctx.user!.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the tournament organizer or an admin can update tournament status",
          });
        }

        // Validate status transitions
        const currentStatus = existingTournament.status;
        const newStatus = input.status;

        // Define valid status transitions
        const validTransitions: Record<string, string[]> = {
          UPCOMING: ["ACTIVE", "COMPLETED"], // Can skip to completed if needed
          ACTIVE: ["COMPLETED"],
          COMPLETED: [], // Cannot change from completed
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          });
        }

        const updatedTournament = await ctx.prisma.tournament.update({
          where: { id: input.id },
          data: { status: input.status },
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return updatedTournament;
      }),

    // Update tournament details (organizer and admins only)
    update: organizerProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          data: UpdateTournamentSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify tournament exists
        const existingTournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.id },
          include: {
            organizer: true,
          },
        });

        if (!existingTournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Check if the current user is the organizer of this tournament or an admin
        if (ctx.user!.id !== existingTournament.organizerId && ctx.user!.role !== 'admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the tournament organizer or an admin can update tournament details",
          });
        }

        // Validate game exists if being updated
        if (input.data.gameId) {
          const game = await ctx.prisma.game.findUnique({
            where: { id: input.data.gameId },
          });

          if (!game) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Game not found",
            });
          }

          if (!game.isActive) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot update tournament to inactive game",
            });
          }
        }

        // Validate store exists if being updated
        if (input.data.storeId) {
          const store = await ctx.prisma.store.findUnique({
            where: { id: input.data.storeId },
          });

          if (!store) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store not found",
            });
          }

          if (!store.isActive) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot update tournament to inactive store",
            });
          }
        }

        // Validate tournament date is not in the past (unless it's being updated to completed)
        if (input.data.date && input.data.status !== "COMPLETED" && input.data.date < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tournament date cannot be in the past for upcoming or active tournaments",
          });
        }

        const updatedTournament = await ctx.prisma.tournament.update({
          where: { id: input.id },
          data: input.data,
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return updatedTournament;
      }),

    // Get upcoming tournaments (public, useful for homepage)
    getUpcoming: publicProcedure
      .input(
        z.object({
          gameId: z.string().uuid().optional(),
          storeId: z.string().uuid().optional(),
          daysAhead: z.number().int().min(1).max(365).default(30),
          limit: z.number().int().min(1).max(50).default(10),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {
          status: "UPCOMING",
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + input.daysAhead * 24 * 60 * 60 * 1000),
          },
        };

        if (input.gameId) {
          where.gameId = input.gameId;
        }

        if (input.storeId) {
          where.storeId = input.storeId;
        }

        const tournaments = await ctx.prisma.tournament.findMany({
          where,
          orderBy: { date: "asc" },
          take: input.limit,
          include: {
            game: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
              },
            },
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return tournaments;
      }),

    // TODO: These routes need to be updated to use the new MatchProcessor class
    // Temporarily commented out until proper implementation
    // See: lib/tournament/match-processor.ts for the new implementation
    
    // // Process individual match result
    // processMatchResult: organizerProcedure
    //   .input(
    //     z.object({
    //       matchId: z.string().uuid(),
    //       winnerId: z.string().uuid().optional(),
    //     }),
    //   )
    //   .mutation(async ({ ctx, input }) => {
    //     // TODO: Implement using MatchProcessor.organizerSubmitResult()
    //   }),

    // // Complete tournament and calculate final standings
    // completeTournament: organizerProcedure
    //   .input(
    //     z.object({
    //       tournamentId: z.string().uuid(),
    //     }),
    //   )
    //   .mutation(async ({ ctx, input }) => {
    //     // TODO: Implement using TournamentProcessor.completeTournament()
    //   }),

    // // Batch process multiple match results
    // batchProcessMatches: organizerProcedure
    //   .input(
    //     z.object({
    //       tournamentId: z.string().uuid(),
    //       matchResults: z.array(
    //         z.object({
    //           matchId: z.string().uuid(),
    //           winnerId: z.string().uuid().optional(),
    //         }),
    //       ),
    //     }),
    //   )
    //   .mutation(async ({ ctx, input }) => {
    //     // TODO: Implement batch processing with MatchProcessor
    //   }),
  }),

  // Basic stores router
  stores: router({
    list: publicProcedure
      .input(
        z.object({
          includeInactive: z.boolean().default(false),
          city: z.string().optional(),
          state: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {};

        if (!input.includeInactive) {
          where.isActive = true;
        }

        if (input.city) {
          where.city = {
            contains: input.city,
            mode: "insensitive",
          };
        }

        if (input.state) {
          where.state = {
            contains: input.state,
            mode: "insensitive",
          };
        }

        const [stores, total] = await Promise.all([
          ctx.prisma.store.findMany({
            where,
            orderBy: { name: "asc" },
            take: input.limit,
            skip: input.offset,
            include: {
              _count: {
                select: {
                  tournaments: true,
                },
              },
            },
          }),
          ctx.prisma.store.count({ where }),
        ]);

        return {
          stores: stores.map((store) => ({
            ...store,
            tournamentCount: store._count.tournaments,
          })),
          total,
          hasMore: input.offset + input.limit < total,
        };
      }),

    // Create a new store (admin only)
    create: adminProcedure
      .input(CreateStoreSchema)
      .mutation(async ({ ctx, input }) => {
        // Check for duplicate store name in same city/state
        const existingStore = await ctx.prisma.store.findFirst({
          where: {
            name: input.name,
            city: input.city,
            state: input.state,
          },
        });

        if (existingStore) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A store with this name already exists in this city and state'
          });
        }

        const store = await ctx.prisma.store.create({
          data: {
            name: input.name,
            address: input.address,
            city: input.city,
            state: input.state,
            zipCode: input.zipCode,
            contactEmail: input.contactEmail || null,
            website: input.website || null,
            isActive: true,
          },
        });

        return store;
      }),
  }),

  // Enhanced matches router
  matches: router({
    // Get match by ID
    getById: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const match = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: {
              include: {
                game: true,
                store: true,
              },
            },
            player1: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
            player2: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
            winner: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!match) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }

        // Filter private player information
        return {
          ...match,
          player1: {
            ...match.player1,
            displayName:
              match.player1.user?.userPreferences?.profileVisibility === "PUBLIC"
                ? (match.player1.user?.firstName || match.player1.user?.name || "Unknown Player")
                : "Private Player",
          },
          player2: {
            ...match.player2,
            displayName:
              match.player2.user?.userPreferences?.profileVisibility === "PUBLIC"
                ? (match.player2.user?.firstName || match.player2.user?.name || "Unknown Player")
                : "Private Player",
          },
          winner: match.winner
            ? {
                ...match.winner,
                displayName:
                  match.winner.user?.userPreferences?.profileVisibility === "PUBLIC"
                    ? (match.winner.user?.firstName || match.winner.user?.name || "Unknown Player")
                    : "Private Player",
              }
            : null,
        };
      }),

    // Create a new match (organizers only)
    create: organizerProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
          player1Id: z.string().uuid(),
          player2Id: z.string().uuid(),
          round: z.number().int().min(1),
          table: z.number().int().min(1).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Verify tournament exists
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
        });

        if (!tournament) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tournament not found",
          });
        }

        // Verify players exist
        const [player1, player2] = await Promise.all([
          ctx.prisma.player.findUnique({ where: { id: input.player1Id } }),
          ctx.prisma.player.findUnique({ where: { id: input.player2Id } }),
        ]);

        if (!player1 || !player2) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "One or both players not found",
          });
        }

        if (input.player1Id === input.player2Id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Player cannot play against themselves",
          });
        }

        // Check for duplicate match in same round
        const existingMatch = await ctx.prisma.match.findFirst({
          where: {
            tournamentId: input.tournamentId,
            round: input.round,
            OR: [
              {
                AND: [
                  { player1Id: input.player1Id },
                  { player2Id: input.player2Id },
                ],
              },
              {
                AND: [
                  { player1Id: input.player2Id },
                  { player2Id: input.player1Id },
                ],
              },
            ],
          },
        });

        if (existingMatch) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Match between these players already exists in this round",
          });
        }

        const match = await ctx.prisma.match.create({
          data: {
            tournamentId: input.tournamentId,
            player1Id: input.player1Id,
            player2Id: input.player2Id,
            round: input.round,
            table: input.table,
            status: "PENDING",
          },
          include: {
            tournament: true,
            player1: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            player2: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        return match;
      }),

    // Update match result (organizers only)
    updateResult: organizerProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          winnerId: z.string().uuid().optional(),
          status: z.enum(["PENDING", "ACTIVE", "COMPLETED"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existingMatch = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: true,
          },
        });

        if (!existingMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }

        // Validate winner if provided
        if (
          input.winnerId &&
          input.winnerId !== existingMatch.player1Id &&
          input.winnerId !== existingMatch.player2Id
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Winner must be one of the match players",
          });
        }

        const updatedMatch = await ctx.prisma.match.update({
          where: { id: input.id },
          data: {
            winnerId: input.winnerId,
            status: input.status,
          },
          include: {
            tournament: true,
            player1: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            player2: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            winner: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        return updatedMatch;
      }),

    // Delete match (organizers only, with restrictions)
    delete: organizerProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existingMatch = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: true,
          },
        });

        if (!existingMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }

        // Prevent deletion of completed matches (data integrity)
        if (existingMatch.status === "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete completed matches to preserve data integrity",
          });
        }

        await ctx.prisma.match.delete({
          where: { id: input.id },
        });

        return { success: true, message: "Match deleted successfully" };
      }),

    // Get matches by tournament
    getByTournament: publicProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
          round: z.number().int().min(1).optional(),
          status: z.enum(["PENDING", "ACTIVE", "COMPLETED"]).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {
          tournamentId: input.tournamentId,
        };

        if (input.round) {
          where.round = input.round;
        }

        if (input.status) {
          where.status = input.status;
        }

        const matches = await ctx.prisma.match.findMany({
          where,
          orderBy: [{ round: "asc" }, { table: "asc" }],
          include: {
            player1: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
            player2: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
            winner: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    userPreferences: {
                      select: {
                        profileVisibility: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Filter private player information
        return matches.map((match) => ({
          ...match,
          player1: {
            ...match.player1,
            displayName:
              match.player1.user?.userPreferences?.profileVisibility === "PUBLIC"
                ? (match.player1.user?.firstName || match.player1.user?.name || "Unknown Player")
                : "Private Player",
          },
          player2: {
            ...match.player2,
            displayName:
              match.player2.user?.userPreferences?.profileVisibility === "PUBLIC"
                ? (match.player2.user?.firstName || match.player2.user?.name || "Unknown Player")
                : "Private Player",
          },
          winner: match.winner
            ? {
                ...match.winner,
                displayName:
                  match.winner.user?.userPreferences?.profileVisibility === "PUBLIC"
                    ? (match.winner.user?.firstName || match.winner.user?.name || "Unknown Player")
                    : "Private Player",
              }
            : null,
        }));
      }),
  }),

  // Enhanced uploads router
  uploads: router({
    // Process tournament file upload
    processTournament: organizerProcedure
      .input(
        z.object({
          tournamentId: z.string().uuid(),
          fileData: z.string(), // Base64 encoded file data
          fileName: z.string().min(1),
          fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Import the parsing functions
        const { parseTournamentFile, validateTournamentData } = await import(
          "@/lib/upload/parsers"
        );
        const { getFileType } = await import(
          "@/lib/upload/config"
        );

        try {
          // Verify tournament exists and user has permission
          const tournament = await ctx.prisma.tournament.findUnique({
            where: { id: input.tournamentId },
            include: {
              game: true,
              store: true,
              organizer: true,
            },
          });

          if (!tournament) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tournament not found",
            });
          }

          // TODO: Add ownership check when auth is fully implemented
          // For now, we'll allow any organizer to upload to any tournament

          // Validate file
          if (input.fileSize > 10 * 1024 * 1024) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "File too large. Maximum size: 10MB",
            });
          }

          // Decode base64 file data
          let fileBuffer: Buffer;
          try {
            fileBuffer = Buffer.from(input.fileData, "base64");
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid file data encoding",
            });
          }

          // Get file type
          const fileType = getFileType(input.fileName);

          // Parse tournament data
          const tournamentData = await parseTournamentFile(
            fileBuffer,
            input.fileName,
          );

          // Validate parsed data
          validateTournamentData(tournamentData);

          // Check for duplicate tournament data
          const existingMatches = await ctx.prisma.match.count({
            where: { tournamentId: input.tournamentId },
          });

          if (existingMatches > 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Tournament already has match data. Cannot overwrite existing results.",
            });
          }

          // Process the tournament data in a transaction
          const result = await ctx.prisma.$transaction(async (tx) => {
            const processedPlayers: Array<{
              playerId: string;
              externalPlayerId: string;
              playerName: string;
            }> = [];
            const processedMatches: Array<Record<string, unknown>> = [];

            // Process players - create or link to existing players
            for (const playerData of tournamentData.players) {
              // Try to find existing player by external ID for this game
              let existingPlayer = await tx.player.findFirst({
                where: {
                  gameStats: {
                    some: {
                      gameId: tournament.gameId,
                    },
                  },
                },
                include: {
                  gameStats: {
                    where: { gameId: tournament.gameId },
                  },
                },
              });

              // Check if external player ID matches
              if (existingPlayer?.externalPlayerIds) {
                const externalIds = existingPlayer.externalPlayerIds as Record<
                  string,
                  string
                >;
                const hasMatchingId = Object.entries(externalIds).some(
                  ([gameId, externalId]) =>
                    gameId === tournament.gameId &&
                    externalId === playerData.externalPlayerId,
                );
                if (!hasMatchingId) {
                  existingPlayer = null;
                }
              } else {
                existingPlayer = null;
              }

              if (!existingPlayer) {
                // Create new player (simplified for now without full auth integration)
                // In a real system, this would create a user account or link to existing one
                throw new TRPCError({
                  code: "NOT_IMPLEMENTED",
                  message: `Player creation not yet implemented. Unknown player: ${playerData.externalPlayerId} (${playerData.playerName}). Please ensure all players are registered in the system first.`,
                });
              }

              processedPlayers.push({
                playerId: existingPlayer.id,
                externalPlayerId: playerData.externalPlayerId,
                playerName: playerData.playerName,
              });
            }

            // Create player ID mapping
            const playerIdMap = new Map<string, string>();
            processedPlayers.forEach((p) => {
              playerIdMap.set(p.externalPlayerId, p.playerId);
            });

            // Process matches
            for (const matchData of tournamentData.matches) {
              const player1Id = playerIdMap.get(matchData.player1ExternalId);
              const player2Id = playerIdMap.get(matchData.player2ExternalId);
              const winnerId = matchData.winnerExternalId
                ? playerIdMap.get(matchData.winnerExternalId)
                : null;

              if (!player1Id || !player2Id) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Match references unknown players: ${matchData.player1ExternalId}, ${matchData.player2ExternalId}`,
                });
              }

              if (matchData.winnerExternalId && !winnerId) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Match references unknown winner: ${matchData.winnerExternalId}`,
                });
              }

              const match = await tx.match.create({
                data: {
                  tournamentId: input.tournamentId,
                  player1Id,
                  player2Id,
                  winnerId,
                  round: matchData.round,
                  table: matchData.table,
                  status: matchData.status,
                },
              });

              processedMatches.push(match);
            }

            // Update tournament status if it was uploaded with results
            if (processedMatches.length > 0) {
              await tx.tournament.update({
                where: { id: input.tournamentId },
                data: {
                  status: "COMPLETED",
                  // Update tournament details from file if provided
                  name:
                    tournamentData.tournament.name !== "Imported Tournament"
                      ? tournamentData.tournament.name
                      : tournament.name,
                  format:
                    tournamentData.tournament.format !== "Standard"
                      ? tournamentData.tournament.format
                      : tournament.format,
                },
              });
            }

            return {
              playersProcessed: processedPlayers.length,
              matchesCreated: processedMatches.length,
              tournamentUpdated: true,
            };
          });

          return {
            success: true,
            message: `Successfully processed tournament file: ${result.playersProcessed} players, ${result.matchesCreated} matches`,
            data: result,
            fileType,
            parsedData: {
              tournament: tournamentData.tournament,
              playerCount: tournamentData.players.length,
              matchCount: tournamentData.matches.length,
            },
          };
        } catch (error) {
          // Re-throw TRPCError as-is
          if (error instanceof TRPCError) {
            throw error;
          }

          // Wrap other errors
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `File processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }),

    // Validate tournament file without processing
    validateTournament: organizerProcedure
      .input(
        z.object({
          fileData: z.string(), // Base64 encoded file data
          fileName: z.string().min(1),
          fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
        }),
      )
      .mutation(async ({ input }) => {
        const { parseTournamentFile, validateTournamentData } = await import(
          "@/lib/upload/parsers"
        );
        const { getFileType } = await import("@/lib/upload/config");

        try {
          // Validate file size
          if (input.fileSize > 10 * 1024 * 1024) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "File too large. Maximum size: 10MB",
            });
          }

          // Decode base64 file data
          let fileBuffer: Buffer;
          try {
            fileBuffer = Buffer.from(input.fileData, "base64");
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid file data encoding",
            });
          }

          // Get file type
          const fileType = getFileType(input.fileName);

          // Parse tournament data
          const tournamentData = await parseTournamentFile(
            fileBuffer,
            input.fileName,
          );

          // Validate parsed data
          validateTournamentData(tournamentData);

          return {
            success: true,
            message: "File validation successful",
            fileType,
            data: {
              tournament: tournamentData.tournament,
              playerCount: tournamentData.players.length,
              matchCount: tournamentData.matches.length,
              players: tournamentData.players.slice(0, 5), // Preview first 5 players
              matches: tournamentData.matches.slice(0, 5), // Preview first 5 matches
            },
          };
        } catch (error) {
          // Re-throw TRPCError as-is
          if (error instanceof TRPCError) {
            throw error;
          }

          // Wrap other errors
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }),
  }),

  // Leaderboards router
  leaderboards: leaderboardsRouter,

  // Decks router
  decks: decksRouter,

  // Tournament entries router
  tournamentEntries: tournamentEntriesRouter,

  // User preferences router
  userPreferences: userPreferencesRouter,

  // Tournament lifecycle router
  tournamentLifecycle: tournamentLifecycleRouter,

  // Match management router
  matchManagement: matchManagementRouter,

  // Invitations router
  invitations: invitationsRouter,

  // Email metrics router (admin only)
  emailMetrics: emailMetricsRouter,
});

export type AppRouter = typeof appRouter;
