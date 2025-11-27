import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../router-factory';
import { prisma } from '../../prisma';
import { sendRoleInvitationEmail } from '../../email';
import { randomBytes } from 'crypto';

/**
 * Router for managing role upgrade invitations
 * Allows admins to invite users to become organizers or admins
 */
export const invitationsRouter = router({
  /**
   * Create a new role upgrade invitation
   * Only admins can create invitations
   */
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        role: z.enum(['organizer', 'admin']),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{
      id: string;
      email: string;
      role: string;
      expiresAt: Date;
      createdAt: Date;
    }> => {
      const { email, role } = input;
      const inviterId = ctx.user!.id;

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });

      if (existingUser) {
        // Check if user already has this role or higher
        const roleHierarchy = { player: 0, organizer: 1, admin: 2 };
        const currentRoleLevel = roleHierarchy[existingUser.role as keyof typeof roleHierarchy] || 0;
        const targetRoleLevel = roleHierarchy[role];

        if (currentRoleLevel >= targetRoleLevel) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `User already has role "${existingUser.role}" which is equal to or higher than "${role}"`,
          });
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.roleInvitation.findFirst({
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
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A pending invitation already exists for this email and role',
        });
      }

      // Generate secure token
      const token = randomBytes(32).toString('hex');

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await prisma.roleInvitation.create({
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
              name: true,
              email: true,
            },
          },
        },
      });

      // Send invitation email
      const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invitationUrl = `${baseURL}/accept-invitation?token=${token}`;

      await sendRoleInvitationEmail({
        email,
        role,
        invitedBy: {
          name: invitation.invitedBy.name || undefined,
          email: invitation.invitedBy.email,
        },
        url: invitationUrl,
        token,
      });

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    }),

  /**
   * List all invitations (admin only)
   */
  list: adminProcedure
    .input(
      z
        .object({
          includeAccepted: z.boolean().default(false),
          includeExpired: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx: _ctx, input }): Promise<Array<{
      id: string;
      email: string;
      role: string;
      invitedBy: { id: string; name: string | null; email: string };
      acceptedAt: Date | null;
      expiresAt: Date;
      createdAt: Date;
      isExpired: boolean;
      isAccepted: boolean;
    }>> => {
      const { includeAccepted = false, includeExpired = false } = input || {};

      const where: Record<string, unknown> = {};

      if (!includeAccepted) {
        where.acceptedAt = null;
      }

      if (!includeExpired) {
        where.expiresAt = {
          gt: new Date(),
        };
      }

      const invitations = await prisma.roleInvitation.findMany({
        where,
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
        acceptedAt: inv.acceptedAt,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.expiresAt < new Date(),
        isAccepted: inv.acceptedAt !== null,
      }));
    }),

  /**
   * Accept an invitation by token
   * Public endpoint - no authentication required initially
   */
  accept: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1, 'Token is required'),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      role: string;
    }> => {
      const { token } = input;
      const userId = ctx.user.id;

      // Find invitation
      const invitation = await prisma.roleInvitation.findUnique({
        where: { token },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has already been accepted',
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has expired',
        });
      }

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Verify email matches (if user exists)
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This invitation is for a different email address',
        });
      }

      // Check if user already has this role or higher
      const roleHierarchy = { player: 0, organizer: 1, admin: 2 };
      const currentRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
      const targetRoleLevel = roleHierarchy[invitation.role as keyof typeof roleHierarchy];

      if (currentRoleLevel >= targetRoleLevel) {
        // Mark as accepted even if role is already sufficient
        await prisma.roleInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return {
          success: true,
          message: `You already have role "${user.role}" which is sufficient`,
          role: user.role,
        };
      }

      // Update user role
      await prisma.user.update({
        where: { id: userId },
        data: { role: invitation.role },
      });

      // Mark invitation as accepted
      await prisma.roleInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
        success: true,
        message: `Successfully upgraded to ${invitation.role}`,
        role: invitation.role,
      };
    }),

  /**
   * Get invitation details by token (public)
   */
  getByToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1, 'Token is required'),
      }),
    )
    .query(async ({ ctx, input }): Promise<{
      id: string;
      email: string;
      role: string;
      invitedBy: { name: string | null; email: string };
      expiresAt: Date;
      createdAt: Date;
      isExpired: boolean;
      isAccepted: boolean;
      emailMatches: boolean;
      canAccept: boolean;
    }> => {
      const { token } = input;

      const invitation = await prisma.roleInvitation.findUnique({
        where: { token },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true },
      });

      const isExpired = invitation.expiresAt < new Date();
      const isAccepted = invitation.acceptedAt !== null;
      const emailMatches = user?.email.toLowerCase() === invitation.email.toLowerCase();

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        isExpired,
        isAccepted,
        emailMatches,
        canAccept: !isExpired && !isAccepted && emailMatches,
      };
    }),

  /**
   * Cancel/delete an invitation (admin only)
   */
  cancel: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input }): Promise<{
      success: boolean;
      message: string;
    }> => {
      const invitation = await prisma.roleInvitation.findUnique({
        where: { id: input.id },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel an already accepted invitation',
        });
      }

      await prisma.roleInvitation.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      };
    }),
});

