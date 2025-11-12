/**
 * Match Management tRPC Router
 * 
 * Provides API endpoints for managing match result submissions including:
 * - Player match result submission with confirmation flow
 * - Opponent confirmation of match results
 * 
 * Supports player-driven result submission with automatic dispute detection
 * when players disagree on match outcomes.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router-factory'
import { MatchProcessor } from '@/lib/tournament/match-processor'

/**
 * Match Management Router
 * 
 * Provides endpoints for match result submission and confirmation with proper
 * authorization checks and comprehensive error handling.
 */
export const matchManagementRouter = router({
  /**
   * Submit Match Result
   * 
   * Allows a player to submit match results. If opponent has already submitted,
   * checks for agreement. If they agree, completes the match. If they disagree,
   * creates a dispute for organizer resolution.
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  submitResult: protectedProcedure
    .input(
      z.object({
        matchId: z.string().uuid({
          message: 'Invalid match ID format'
        }),
        winnerId: z.string().uuid({
          message: 'Invalid winner ID format'
        }).nullable(),
        player1Score: z.number().int().min(0, {
          message: 'Player 1 score must be non-negative'
        }),
        player2Score: z.number().int().min(0, {
          message: 'Player 2 score must be non-negative'
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

      // Get the player record for the current user
      const player = await ctx.prisma.player.findUnique({
        where: { userId: ctx.user.id },
        select: {
          id: true,
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
          message: 'Player record not found. Please ensure your profile is complete.'
        })
      }

      // Verify match exists and get tournament info
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          player1: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true
                }
              }
            }
          },
          player2: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true
                }
              }
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

      // Validate player is in the match
      if (match.player1Id !== player.id && match.player2Id !== player.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to submit results for this match'
        })
      }

      // Initialize MatchProcessor and submit result
      const matchProcessor = new MatchProcessor(ctx.prisma as any)
      
      try {
        const result = await matchProcessor.submitMatchResult(
          input.matchId,
          player.id,
          {
            winnerId: input.winnerId,
            player1Score: input.player1Score,
            player2Score: input.player2Score
          }
        )

        // Format response based on submission outcome
        const playerName = player.user.firstName 
          ? `${player.user.firstName} ${player.user.lastName || ''}`.trim()
          : player.user.name || 'Unknown Player'

        if (result.dispute) {
          // Players disagreed - dispute created
          return {
            success: true,
            message: `Match result submitted by ${playerName}, but results conflict with opponent's submission. Dispute created for organizer review.`,
            match: result.match,
            requiresConfirmation: result.requiresConfirmation,
            disputed: true,
            dispute: result.dispute
          }
        } else if (result.requiresConfirmation) {
          // First submission - waiting for opponent
          const opponentId = match.player1Id === player.id ? match.player2Id : match.player1Id
          const opponent = match.player1Id === player.id ? match.player2 : match.player1
          const opponentName = opponent.user.firstName
            ? `${opponent.user.firstName} ${opponent.user.lastName || ''}`.trim()
            : opponent.user.name || 'Unknown Player'

          return {
            success: true,
            message: `Match result submitted by ${playerName}. Waiting for ${opponentName} to confirm.`,
            match: result.match,
            requiresConfirmation: result.requiresConfirmation,
            disputed: false
          }
        } else {
          // Both players agreed - match completed
          return {
            success: true,
            message: `Match result confirmed! Both players agreed on the outcome.`,
            match: result.match,
            requiresConfirmation: result.requiresConfirmation,
            disputed: false
          }
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error submitting match result:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to submit match result: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  /**
   * Confirm Match Result
   * 
   * Allows the opponent to confirm a pending match result submission.
   * Retrieves the pending submission and completes the match if the
   * opponent confirms.
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  confirmResult: protectedProcedure
    .input(
      z.object({
        matchId: z.string().uuid({
          message: 'Invalid match ID format'
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

      // Get the player record for the current user
      const player = await ctx.prisma.player.findUnique({
        where: { userId: ctx.user.id },
        select: {
          id: true,
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
          message: 'Player record not found. Please ensure your profile is complete.'
        })
      }

      // Verify match exists and get tournament info
      const match = await ctx.prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          player1: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true
                }
              }
            }
          },
          player2: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true
                }
              }
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

      // Validate player is the opponent (not the submitter)
      if (match.player1Id !== player.id && match.player2Id !== player.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to confirm results for this match'
        })
      }

      // Initialize MatchProcessor and confirm result
      const matchProcessor = new MatchProcessor(ctx.prisma as any)
      
      try {
        const updatedMatch = await matchProcessor.confirmMatchResult(
          input.matchId,
          player.id
        )

        const playerName = player.user.firstName 
          ? `${player.user.firstName} ${player.user.lastName || ''}`.trim()
          : player.user.name || 'Unknown Player'

        return {
          success: true,
          message: `Match result confirmed by ${playerName}. Match is now complete.`,
          match: updatedMatch
        }
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        console.error('Error confirming match result:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to confirm match result: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    })
})
