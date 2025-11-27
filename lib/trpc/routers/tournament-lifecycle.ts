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
import { router, organizerProcedure, protectedProcedure } from '../router-factory'
import { TournamentProcessor } from '@/lib/tournament/tournament-processor'
import { RatingCalculator } from '@/lib/tournament/rating-calculator'
import { AuditLogger } from '@/lib/tournament/audit-logger'
import { canManageTournament } from '@/lib/tournament/authorization'
import type { ProjectedRating, TournamentAuditLog } from '@/lib/tournament/types'

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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
      matches: unknown[];
    }> => {
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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
      newMatches: unknown[];
      currentRound: number;
      tournamentEnded: boolean;
    }> => {
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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
      finalStandings: unknown[];
      ratingUpdates: unknown[];
      stats: {
        totalPlayers: number;
        ratingChangesApplied: number;
        winner: {
          playerId?: string;
          placement?: number;
          name: string;
        };
      };
    }> => {
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
                placement: winner?.placement ?? undefined,
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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
    }> => {
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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
    }> => {
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
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      tournament: unknown;
    }> => {
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
    }),

  /**
   * Create Manual Pairings
   * 
   * Validates authorization, checks tournament state, validates all players
   * are registered and not dropped, validates no duplicate pairings in same
   * round, creates Match records with PENDING status, and logs the action.
   * 
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   */
  createManualPairings: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        }),
        pairings: z.array(
          z.object({
            player1Id: z.string().uuid({
              message: 'Invalid player1 ID format'
            }),
            player2Id: z.string().uuid({
              message: 'Invalid player2 ID format'
            }),
            table: z.number().int().positive().optional()
          })
        ).min(1, {
          message: 'At least one pairing is required'
        })
      })
    )
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      matches: unknown[];
    }> => {
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
          message: 'Only the tournament organizer or an admin can create manual pairings'
        })
      }

      // Initialize TournamentProcessor and create manual pairings
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const matches = await processor.createManualPairings(
          input.tournamentId,
          ctx.user.id,
          input.pairings
        )

        return {
          success: true,
          message: `Created ${matches.length} manual pairing(s) for tournament "${tournament.name}"`,
          matches
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error creating manual pairings:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create manual pairings: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Update Manual Pairing
   * 
   * Validates authorization, checks match is PENDING (not started), updates
   * player assignments or table number, and logs the action with previous
   * values.
   * 
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   */
  updateManualPairing: organizerProcedure
    .input(
      z.object({
        matchId: z.string().uuid({
          message: 'Invalid match ID format'
        }),
        player1Id: z.string().uuid({
          message: 'Invalid player1 ID format'
        }).optional(),
        player2Id: z.string().uuid({
          message: 'Invalid player2 ID format'
        }).optional(),
        table: z.number().int().positive().optional()
      }).refine(
        (data) => data.player1Id !== undefined || data.player2Id !== undefined || data.table !== undefined,
        {
          message: 'At least one field (player1Id, player2Id, or table) must be provided for update'
        }
      )
    )
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      match: unknown;
    }> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Fetch match to get tournament info for authorization check
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        select: {
          id: true,
          tournamentId: true,
          tournament: {
            select: {
              id: true,
              organizerId: true,
              name: true
            }
          }
        }
      })

      if (!match) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found'
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, match.tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can update manual pairings'
        })
      }

      // Initialize TournamentProcessor and update manual pairing
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const updates: { player1Id?: string; player2Id?: string; table?: number } = {}
        if (input.player1Id !== undefined) updates.player1Id = input.player1Id
        if (input.player2Id !== undefined) updates.player2Id = input.player2Id
        if (input.table !== undefined) updates.table = input.table

        const updatedMatch = await processor.updateManualPairing(
          input.matchId,
          ctx.user.id,
          updates
        )

        return {
          success: true,
          message: `Updated manual pairing in tournament "${match.tournament.name}"`,
          match: updatedMatch
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error updating manual pairing:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update manual pairing: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Delete Manual Pairing
   * 
   * Validates authorization, checks match is PENDING, deletes match record,
   * and logs the action.
   * 
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   */
  deleteManualPairing: organizerProcedure
    .input(
      z.object({
        matchId: z.string().uuid({
          message: 'Invalid match ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
    }> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Fetch match to get tournament info for authorization check
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        select: {
          id: true,
          status: true,
          tournamentId: true,
          tournament: {
            select: {
              id: true,
              organizerId: true,
              name: true
            }
          }
        }
      })

      if (!match) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found'
        })
      }

      // Validate match is PENDING
      if (match.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete match with status ${match.status}. Match must be PENDING.`
        })
      }

      // Validate authorization (organizer or admin)
      if (!canManageTournament(ctx.user.id, ctx.user.role, match.tournament)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the tournament organizer or an admin can delete manual pairings'
        })
      }

      // Initialize TournamentProcessor and delete manual pairing
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        await processor.deleteManualPairing(
          input.matchId,
          ctx.user.id
        )

        return {
          success: true,
          message: `Deleted manual pairing from tournament "${match.tournament.name}"`
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error deleting manual pairing:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete manual pairing: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Drop Player
   * 
   * Allows a player to drop from a tournament, or allows an organizer/admin
   * to drop a player. Updates TournamentEntry.dropped to true, excludes player
   * from future pairings (Swiss), or advances opponent if match is pending
   * (Elimination).
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  dropPlayer: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        }),
        playerId: z.string().uuid({
          message: 'Invalid player ID format'
        })
      })
    )
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      entry: unknown;
      affectedMatches: unknown[];
      stats: {
        affectedMatchCount: number;
      };
    }> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          organizerId: true,
          name: true,
          status: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Get the player record for the user
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true
            }
          }
        }
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found'
        })
      }

      // Validate authorization: player can drop themselves, organizer/admin can drop anyone
      const isOwnPlayer = player.userId === ctx.user.id
      const canManage = canManageTournament(ctx.user.id, ctx.user.role, tournament)

      if (!isOwnPlayer && !canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only drop yourself from a tournament, unless you are the organizer or an admin'
        })
      }

      // Initialize TournamentProcessor and drop player
      const processor = new TournamentProcessor(ctx.prisma as any)
      
      try {
        const result = await processor.dropPlayer(
          input.tournamentId,
          input.playerId
        )

        const playerName = player.user.firstName 
          ? `${player.user.firstName} ${player.user.lastName || ''}`.trim()
          : player.user.name || 'Unknown Player'

        return {
          success: true,
          message: `${playerName} has been dropped from tournament "${tournament.name}"`,
          entry: result.entry,
          affectedMatches: result.affectedMatches,
          stats: {
            affectedMatchCount: result.affectedMatches.length
          }
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error dropping player:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to drop player: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Get Projected Ratings
   * 
   * Calculates and returns projected rating changes for all participants in
   * an active tournament based on current match results. Provides real-time
   * feedback on how tournament performance will affect player ratings.
   * 
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  getProjectedRatings: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        })
      })
    )
    .query(async ({ ctx, input }): Promise<{
      success: boolean;
      tournamentId: string;
      tournamentName: string;
      tournamentStatus: string;
      projectedRatings: ProjectedRating[];
      stats: {
        totalPlayers: number;
        averageRatingChange: number;
      };
    }> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }

      // Verify tournament exists
      const tournament = await ctx.prisma.tournament.findUnique({
        where: { id: input.tournamentId },
        select: {
          id: true,
          name: true,
          status: true,
          gameId: true
        }
      })

      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found'
        })
      }

      // Initialize RatingCalculator and get projected ratings
      const ratingCalculator = new RatingCalculator(ctx.prisma as any)
      
      try {
        const projectedRatings = await ratingCalculator.calculateProjectedRatings(
          input.tournamentId
        )

        return {
          success: true,
          tournamentId: input.tournamentId,
          tournamentName: tournament.name,
          tournamentStatus: tournament.status,
          projectedRatings,
          stats: {
            totalPlayers: projectedRatings.length,
            averageRatingChange: projectedRatings.length > 0
              ? projectedRatings.reduce((sum, p) => sum + p.ratingChange, 0) / projectedRatings.length
              : 0
          }
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error calculating projected ratings:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to calculate projected ratings: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Get Audit Trail
   * 
   * Retrieves the complete audit trail for a tournament with optional filtering
   * by action type, user, and date range. Provides transparency and accountability
   * for all tournament actions.
   * 
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
   */
  getAuditTrail: organizerProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid({
          message: 'Invalid tournament ID format'
        }),
        filters: z.object({
          action: z.enum([
            'START',
            'ADVANCE_ROUND',
            'SUBMIT_MATCH',
            'OVERRIDE_MATCH',
            'PAUSE',
            'RESUME',
            'CANCEL',
            'COMPLETE',
            'PLAYER_DROP',
            'ASSIGN_BYE',
            'CREATE_MANUAL_PAIRING',
            'UPDATE_MANUAL_PAIRING',
            'DELETE_MANUAL_PAIRING',
            'RESOLVE_DISPUTE'
          ]).optional(),
          performedBy: z.string().uuid().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional()
        }).optional()
      })
    )
    .query(async ({ ctx, input }): Promise<{
      success: boolean;
      tournamentId: string;
      tournamentName: string;
      auditTrail: TournamentAuditLog[];
      stats: {
        totalEntries: number;
        dateRange: {
          earliest: Date;
          latest: Date;
        } | null;
      };
    }> => {
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
          message: 'Only the tournament organizer or an admin can view the audit trail'
        })
      }

      // Initialize AuditLogger and get audit trail
      const auditLogger = new AuditLogger(ctx.prisma as any)
      
      try {
        const auditTrail = await auditLogger.getAuditTrail(
          input.tournamentId,
          input.filters
        )

        return {
          success: true,
          tournamentId: input.tournamentId,
          tournamentName: tournament.name,
          auditTrail,
          stats: {
            totalEntries: auditTrail.length,
            dateRange: auditTrail.length > 0 ? {
              earliest: auditTrail[auditTrail.length - 1].timestamp,
              latest: auditTrail[0].timestamp
            } : null
          }
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error retrieving audit trail:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to retrieve audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    })
})
