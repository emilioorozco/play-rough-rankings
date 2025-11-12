/**
 * Tournament Lifecycle tRPC Router
 * 
 * Provides API endpoints for managing tournament lifecycle including:
 * - Starting tournaments and generating initial pairings
 * - Advancing rounds with automatic pairing generation
 * - Completing tournaments with final standings and rating updates
 * 
 * All endpoints require organizer or admin authorization.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, organizerProcedure } from '../router-factory'
import { TournamentProcessor } from '@/lib/tournament/tournament-processor'

/**
 * Authorization helper to check if user can manage tournament
 * 
 * @param userId - ID of the user attempting the action
 * @param userRole - Role of the user (player, organizer, admin)
 * @param tournament - Tournament data with organizerId
 * @returns true if user is authorized, false otherwise
 */
function canManageTournament(
  userId: string,
  userRole: string,
  tournament: { organizerId: string }
): boolean {
  // Admins can manage any tournament
  if (userRole === 'admin') {
    return true
  }
  
  // Organizers can only manage their own tournaments
  if (userRole === 'organizer' && tournament.organizerId === userId) {
    return true
  }
  
  return false
}

/**
 * Tournament Lifecycle Router
 * 
 * Provides endpoints for tournament lifecycle management with proper
 * authorization checks and comprehensive error handling.
 */
export const tournamentLifecycleRouter = router({
  /**
   * Start Tournament
   * 
   * Validates authorization, checks tournament status and player count,
   * generates initial pairings, creates matches, and updates tournament
   * status to ACTIVE.
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  start: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can start this tournament'
        })
      }

      // Initialize TournamentProcessor and start tournament
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.startTournament(
          input.tournamentId,
          ctx.user.id
        )

        return {
          success: true,
          message: `Tournament "${tournament.name}" started successfully with ${result.matches.length} initial matches`,
          tournament: result.tournament,
          matches: result.matches
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error starting tournament:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Advance Round
   * 
   * Validates authorization, checks all current round matches are completed,
   * generates pairings for next round based on tournament structure,
   * creates new matches, and updates tournament state.
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  advanceRound: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true,
          tournamentStructure: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can advance this tournament'
        })
      }

      // Initialize TournamentProcessor and advance round
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.advanceRound(
          input.tournamentId,
          ctx.user.id
        )

        // Check if tournament ended
        if (result.tournamentEnded) {
          return {
            success: true,
            message: `Tournament "${tournament.name}" has completed all rounds. Ready for completion.`,
            tournament: result.tournament,
            newMatches: result.newMatches,
            currentRound: result.currentRound,
            tournamentEnded: true
          }
        }

        return {
          success: true,
          message: `Advanced to round ${result.currentRound} with ${result.newMatches.length} new matches`,
          tournament: result.tournament,
          newMatches: result.newMatches,
          currentRound: result.currentRound,
          tournamentEnded: false
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error advancing tournament round:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to advance tournament round: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Complete Tournament
   * 
   * Validates authorization, checks all rounds are finished, calculates
   * final placements, updates tournament status to COMPLETED, applies
   * rating changes, and triggers ranking cache invalidation.
   * 
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  complete: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can complete this tournament'
        })
      }

      // Initialize TournamentProcessor and complete tournament
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.completeTournament(
          input.tournamentId,
          ctx.user.id
        )

        // Get winner information for response message
        const winner = result.finalStandings.find(entry => entry.placement === 1)
        const winnerInfo = winner ? await ctx.prisma.player.findUnique({
          where: { id: winner.playerId },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true
              }
            }
          }
        }) : null

        const winnerName = winnerInfo?.user?.firstName 
          ? `${winnerInfo.user.firstName} ${winnerInfo.user.lastName || ''}`.trim()
          : winnerInfo?.user?.name || 'Unknown Player'

        return {
          success: true,
          message: `Tournament "${tournament.name}" completed successfully. Winner: ${winnerName}`,
          tournament: result.tournament,
          finalStandings: result.finalStandings,
          ratingUpdates: result.ratingUpdates,
          stats: {
            totalPlayers: result.finalStandings.length,
            ratingChangesApplied: result.ratingUpdates.length,
            winner: {
              playerId: winner?.playerId,
              placement: winner?.placement,
              name: winnerName
            }
          }
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error completing tournament:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to complete tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Pause Tournament
   * 
   * Validates authorization, checks tournament is ACTIVE, updates status to
   * PAUSED, and logs the action with optional reason. Prevents new match
   * submissions and round advancement while allowing in-progress matches
   * to complete.
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  pause: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        }),
        reason: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can pause this tournament'
        })
      }

      // Initialize TournamentProcessor and pause tournament
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.pauseTournament(
          input.tournamentId,
          ctx.user.id,
          input.reason
        )

        return {
          success: true,
          message: `Tournament "${tournament.name}" has been paused${input.reason ? `: ${input.reason}` : ''}`,
          tournament: result
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error pausing tournament:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to pause tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Resume Tournament
   * 
   * Validates authorization, checks tournament is PAUSED, updates status to
   * ACTIVE, and logs the action. Restores normal match submission and
   * progression capabilities.
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  resume: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can resume this tournament'
        })
      }

      // Initialize TournamentProcessor and resume tournament
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.resumeTournament(
          input.tournamentId,
          ctx.user.id
        )

        return {
          success: true,
          message: `Tournament "${tournament.name}" has been resumed`,
          tournament: result
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error resuming tournament:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to resume tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Cancel Tournament
   * 
   * Validates authorization, checks tournament is not COMPLETED, updates
   * status to CANCELLED, logs the action with reason, and preserves all
   * match results and standings for record keeping. Prevents any further
   * match submissions or tournament progression.
   * 
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  cancel: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        }),
        reason: z.string().min(1, {
          message: 'Cancellation reason is required'
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists and check authorization
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          status: true,
          name: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can cancel this tournament'
        })
      }

      // Initialize TournamentProcessor and cancel tournament
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.cancelTournament(
          input.tournamentId,
          ctx.user.id,
          input.reason
        )

        return {
          success: true,
          message: `Tournament "${tournament.name}" has been cancelled: ${input.reason}`,
          tournament: result
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error cancelling tournament:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to cancel tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    })
})
