/**
 * Tournament Error Handling Utilities
 * 
 * Provides comprehensive error handling, validation, and recovery mechanisms
 * for tournament lifecycle management operations.
 */

import { TRPCError } from '@trpc/server'
import type { PrismaClient, Tournament, Match } from '@prisma/client'

/**
 * Error codes for tournament operations
 */
export enum TournamentErrorCode {
  // Concurrent operation errors
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  MATCH_ALREADY_SUBMITTED = 'MATCH_ALREADY_SUBMITTED',
  TOURNAMENT_STATE_CHANGED = 'TOURNAMENT_STATE_CHANGED',
  
  // State transition errors
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INCOMPLETE_ROUND = 'INCOMPLETE_ROUND',
  TOURNAMENT_NOT_READY = 'TOURNAMENT_NOT_READY',
  
  // Pairing errors
  INVALID_PAIRING = 'INVALID_PAIRING',
  DUPLICATE_PAIRING = 'DUPLICATE_PAIRING',
  INSUFFICIENT_PLAYERS = 'INSUFFICIENT_PLAYERS',
  PLAYER_ALREADY_PAIRED = 'PLAYER_ALREADY_PAIRED',
  
  // Rating calculation errors
  RATING_CALCULATION_FAILED = 'RATING_CALCULATION_FAILED',
  MISSING_PLAYER_STATS = 'MISSING_PLAYER_STATS',
  INVALID_RATING_DATA = 'INVALID_RATING_DATA',
  
  // General errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
}

/**
 * Custom error class for tournament operations
 */
export class TournamentError extends Error {
  constructor(
    public code: TournamentErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'TournamentError'
  }
}

/**
 * Concurrent operation handler with optimistic locking
 */
export class ConcurrentOperationHandler {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 100

  /**
   * Execute an operation with retry logic for concurrent modifications
   * 
   * @param operation - Async operation to execute
   * @param retries - Number of retries remaining
   * @returns Result of the operation
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = ConcurrentOperationHandler.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      // Check if error is due to concurrent modification
      if (this.isConcurrentModificationError(error) && retries > 0) {
        // Wait before retrying
        await this.delay(ConcurrentOperationHandler.RETRY_DELAY_MS)
        return this.executeWithRetry(operation, retries - 1)
      }
      throw error
    }
  }

  /**
   * Check if error is due to concurrent modification
   */
  private static isConcurrentModificationError(error: any): boolean {
    if (error instanceof TRPCError) {
      return error.code === 'CONFLICT' || error.message.includes('concurrent')
    }
    if (error instanceof Error) {
      return error.message.includes('concurrent') || 
             error.message.includes('already') ||
             error.message.includes('modified')
    }
    return false
  }

  /**
   * Delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate tournament hasn't been modified since last read
   * 
   * @param prisma - Prisma client
   * @param tournamentId - Tournament ID
   * @param expectedUpdatedAt - Expected last update timestamp
   * @throws TournamentError if tournament was modified
   */
  static async validateTournamentNotModified(
    prisma: PrismaClient,
    tournamentId: string,
    expectedUpdatedAt: Date
  ): Promise<void> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { updatedAt: true }
    })

    if (!tournament) {
      throw new TournamentError(
        TournamentErrorCode.VALIDATION_FAILED,
        'Tournament not found'
      )
    }

    if (tournament.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new TournamentError(
        TournamentErrorCode.CONCURRENT_MODIFICATION,
        'Tournament was modified by another operation. Please refresh and try again.',
        {
          expectedUpdatedAt,
          actualUpdatedAt: tournament.updatedAt
        }
      )
    }
  }

  /**
   * Validate match hasn't been modified since last read
   * 
   * @param prisma - Prisma client
   * @param matchId - Match ID
   * @param expectedStatus - Expected match status
   * @throws TournamentError if match was modified
   */
  static async validateMatchNotModified(
    prisma: PrismaClient,
    matchId: string,
    expectedStatus: string
  ): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true }
    })

    if (!match) {
      throw new TournamentError(
        TournamentErrorCode.VALIDATION_FAILED,
        'Match not found'
      )
    }

    if (match.status !== expectedStatus) {
      throw new TournamentError(
        TournamentErrorCode.MATCH_ALREADY_SUBMITTED,
        `Match status changed from ${expectedStatus} to ${match.status}. Please refresh and try again.`,
        {
          expectedStatus,
          actualStatus: match.status
        }
      )
    }
  }
}

/**
 * Tournament state transition validator
 */
export class StateTransitionValidator {
  /**
   * Valid state transitions for tournaments
   */
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    'UPCOMING': ['ACTIVE', 'CANCELLED'],
    'ACTIVE': ['PAUSED', 'COMPLETED', 'CANCELLED'],
    'PAUSED': ['ACTIVE', 'CANCELLED'],
    'COMPLETED': [], // No transitions from completed
    'CANCELLED': [], // No transitions from cancelled
  }

  /**
   * Validate state transition is allowed
   * 
   * @param currentStatus - Current tournament status
   * @param newStatus - Desired new status
   * @throws TournamentError if transition is invalid
   */
  static validateTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions = this.VALID_TRANSITIONS[currentStatus] || []
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new TournamentError(
        TournamentErrorCode.INVALID_STATE_TRANSITION,
        `Cannot transition tournament from ${currentStatus} to ${newStatus}`,
        {
          currentStatus,
          newStatus,
          allowedTransitions
        }
      )
    }
  }

  /**
   * Validate tournament is ready for round advancement
   * 
   * @param tournament - Tournament with matches
   * @param currentRound - Current round number
   * @throws TournamentError if tournament is not ready
   */
  static validateReadyForAdvancement(
    tournament: Tournament & { matches: Match[] },
    currentRound: number
  ): void {
    // Check tournament status
    if (tournament.status !== 'ACTIVE') {
      throw new TournamentError(
        TournamentErrorCode.TOURNAMENT_NOT_READY,
        `Tournament must be ACTIVE to advance rounds. Current status: ${tournament.status}`
      )
    }

    // Check all current round matches are completed
    const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound)
    const incompleteMatches = currentRoundMatches.filter(m => m.status !== 'COMPLETED')

    if (incompleteMatches.length > 0) {
      throw new TournamentError(
        TournamentErrorCode.INCOMPLETE_ROUND,
        `Cannot advance round. ${incompleteMatches.length} match(es) in round ${currentRound} are not completed.`,
        {
          currentRound,
          incompleteMatchCount: incompleteMatches.length,
          incompleteMatchIds: incompleteMatches.map(m => m.id)
        }
      )
    }
  }

  /**
   * Validate tournament is ready for completion
   * 
   * @param tournament - Tournament with matches
   * @throws TournamentError if tournament is not ready
   */
  static validateReadyForCompletion(
    tournament: Tournament & { matches: Match[] }
  ): void {
    // Check tournament status
    if (tournament.status !== 'ACTIVE') {
      throw new TournamentError(
        TournamentErrorCode.TOURNAMENT_NOT_READY,
        `Tournament must be ACTIVE to complete. Current status: ${tournament.status}`
      )
    }

    // Check all matches are completed
    const incompleteMatches = tournament.matches.filter(m => m.status !== 'COMPLETED')

    if (incompleteMatches.length > 0) {
      throw new TournamentError(
        TournamentErrorCode.INCOMPLETE_ROUND,
        `Cannot complete tournament. ${incompleteMatches.length} match(es) are not completed.`,
        {
          incompleteMatchCount: incompleteMatches.length,
          incompleteMatchIds: incompleteMatches.map(m => m.id)
        }
      )
    }

    // Check at least one round was played
    if (tournament.matches.length === 0) {
      throw new TournamentError(
        TournamentErrorCode.TOURNAMENT_NOT_READY,
        'Cannot complete tournament with no matches played'
      )
    }
  }
}

/**
 * Pairing validator for tournament pairings
 */
export class PairingValidator {
  /**
   * Validate pairing is valid
   * 
   * @param player1Id - First player ID
   * @param player2Id - Second player ID
   * @param activePlayerIds - Set of active player IDs
   * @throws TournamentError if pairing is invalid
   */
  static validatePairing(
    player1Id: string,
    player2Id: string,
    activePlayerIds: Set<string>
  ): void {
    // Check players are different (unless it's a bye)
    if (player1Id === player2Id) {
      // This is allowed for bye matches
      return
    }

    // Check both players are active
    if (!activePlayerIds.has(player1Id)) {
      throw new TournamentError(
        TournamentErrorCode.INVALID_PAIRING,
        `Player ${player1Id} is not registered or has dropped from the tournament`
      )
    }

    if (!activePlayerIds.has(player2Id)) {
      throw new TournamentError(
        TournamentErrorCode.INVALID_PAIRING,
        `Player ${player2Id} is not registered or has dropped from the tournament`
      )
    }
  }

  /**
   * Validate no duplicate pairings in round
   * 
   * @param pairings - Array of pairings to validate
   * @param existingMatches - Existing matches in the round
   * @param round - Round number
   * @throws TournamentError if duplicate pairings found
   */
  static validateNoDuplicates(
    pairings: Array<{ player1Id: string; player2Id: string }>,
    existingMatches: Match[],
    round: number
  ): void {
    // Check for duplicates within new pairings
    const pairingSet = new Set<string>()
    const playerSet = new Set<string>()

    for (const pairing of pairings) {
      // Create normalized pairing key
      const pairingKey = [pairing.player1Id, pairing.player2Id].sort().join('-')

      if (pairingSet.has(pairingKey)) {
        throw new TournamentError(
          TournamentErrorCode.DUPLICATE_PAIRING,
          `Duplicate pairing detected: ${pairing.player1Id} vs ${pairing.player2Id}`
        )
      }
      pairingSet.add(pairingKey)

      // Check if player is already paired (unless it's a bye)
      if (pairing.player1Id !== pairing.player2Id) {
        if (playerSet.has(pairing.player1Id)) {
          throw new TournamentError(
            TournamentErrorCode.PLAYER_ALREADY_PAIRED,
            `Player ${pairing.player1Id} is paired multiple times in round ${round}`
          )
        }
        if (playerSet.has(pairing.player2Id)) {
          throw new TournamentError(
            TournamentErrorCode.PLAYER_ALREADY_PAIRED,
            `Player ${pairing.player2Id} is paired multiple times in round ${round}`
          )
        }

        playerSet.add(pairing.player1Id)
        playerSet.add(pairing.player2Id)
      }
    }

    // Check against existing matches
    for (const pairing of pairings) {
      const pairingKey = [pairing.player1Id, pairing.player2Id].sort().join('-')
      
      const existingPairing = existingMatches.find(m => {
        const existingKey = [m.player1Id, m.player2Id].sort().join('-')
        return existingKey === pairingKey
      })

      if (existingPairing) {
        throw new TournamentError(
          TournamentErrorCode.DUPLICATE_PAIRING,
          `Pairing already exists in round ${round}: ${pairing.player1Id} vs ${pairing.player2Id}`,
          {
            existingMatchId: existingPairing.id
          }
        )
      }
    }
  }

  /**
   * Validate sufficient players for tournament
   * 
   * @param playerCount - Number of active players
   * @param minimumPlayers - Minimum required players
   * @throws TournamentError if insufficient players
   */
  static validateSufficientPlayers(
    playerCount: number,
    minimumPlayers: number = 2
  ): void {
    if (playerCount < minimumPlayers) {
      throw new TournamentError(
        TournamentErrorCode.INSUFFICIENT_PLAYERS,
        `Insufficient players. Minimum ${minimumPlayers} required, found ${playerCount}.`,
        {
          playerCount,
          minimumPlayers
        }
      )
    }
  }
}

/**
 * Rating calculation error handler
 */
export class RatingCalculationHandler {
  /**
   * Safely calculate rating changes with error handling
   * 
   * @param calculateFn - Rating calculation function
   * @param fallbackRating - Fallback rating if calculation fails
   * @returns Calculated rating or fallback
   */
  static async safeCalculate<T>(
    calculateFn: () => Promise<T>,
    fallbackValue: T,
    context: string
  ): Promise<T> {
    try {
      return await calculateFn()
    } catch (error) {
      console.error(`Rating calculation error in ${context}:`, error)
      
      // Log error but don't fail the entire operation
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`)
      }

      return fallbackValue
    }
  }

  /**
   * Validate player stats exist for rating calculation
   * 
   * @param playerId - Player ID
   * @param gameId - Game ID
   * @param stats - Player game stats or null
   * @throws TournamentError if stats are missing
   */
  static validatePlayerStats(
    playerId: string,
    gameId: string,
    stats: any | null
  ): void {
    if (!stats) {
      throw new TournamentError(
        TournamentErrorCode.MISSING_PLAYER_STATS,
        `Player stats not found for player ${playerId} in game ${gameId}`,
        {
          playerId,
          gameId
        }
      )
    }
  }

  /**
   * Validate rating data is valid
   * 
   * @param rating - Rating value
   * @param context - Context for error message
   * @throws TournamentError if rating is invalid
   */
  static validateRating(rating: number, context: string): void {
    if (typeof rating !== 'number' || isNaN(rating) || rating < 0) {
      throw new TournamentError(
        TournamentErrorCode.INVALID_RATING_DATA,
        `Invalid rating value in ${context}: ${rating}`,
        {
          rating,
          context
        }
      )
    }
  }
}

/**
 * Error recovery utilities
 */
export class ErrorRecovery {
  /**
   * Attempt to recover from a failed operation
   * 
   * @param error - Error that occurred
   * @param recoveryFn - Recovery function to attempt
   * @returns Recovery result or rethrows error
   */
  static async attemptRecovery<T>(
    error: any,
    recoveryFn: () => Promise<T>
  ): Promise<T> {
    try {
      console.log('Attempting error recovery...')
      return await recoveryFn()
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError)
      // Rethrow original error
      throw error
    }
  }

  /**
   * Convert TournamentError to TRPCError
   * 
   * @param error - Tournament error
   * @returns TRPC error
   */
  static toTRPCError(error: TournamentError): TRPCError {
    const codeMap: Record<TournamentErrorCode, 'BAD_REQUEST' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR'> = {
      [TournamentErrorCode.CONCURRENT_MODIFICATION]: 'CONFLICT',
      [TournamentErrorCode.MATCH_ALREADY_SUBMITTED]: 'CONFLICT',
      [TournamentErrorCode.TOURNAMENT_STATE_CHANGED]: 'CONFLICT',
      [TournamentErrorCode.INVALID_STATE_TRANSITION]: 'BAD_REQUEST',
      [TournamentErrorCode.INCOMPLETE_ROUND]: 'BAD_REQUEST',
      [TournamentErrorCode.TOURNAMENT_NOT_READY]: 'BAD_REQUEST',
      [TournamentErrorCode.INVALID_PAIRING]: 'BAD_REQUEST',
      [TournamentErrorCode.DUPLICATE_PAIRING]: 'BAD_REQUEST',
      [TournamentErrorCode.INSUFFICIENT_PLAYERS]: 'BAD_REQUEST',
      [TournamentErrorCode.PLAYER_ALREADY_PAIRED]: 'BAD_REQUEST',
      [TournamentErrorCode.RATING_CALCULATION_FAILED]: 'INTERNAL_SERVER_ERROR',
      [TournamentErrorCode.MISSING_PLAYER_STATS]: 'BAD_REQUEST',
      [TournamentErrorCode.INVALID_RATING_DATA]: 'BAD_REQUEST',
      [TournamentErrorCode.VALIDATION_FAILED]: 'BAD_REQUEST',
      [TournamentErrorCode.OPERATION_TIMEOUT]: 'INTERNAL_SERVER_ERROR',
      [TournamentErrorCode.TRANSACTION_FAILED]: 'INTERNAL_SERVER_ERROR',
    }

    return new TRPCError({
      code: codeMap[error.code] || 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error.details
    })
  }
}

/**
 * Comprehensive error messages for user-friendly feedback
 */
export const ErrorMessages = {
  // Concurrent operations
  CONCURRENT_MATCH_SUBMISSION: 'This match result was just submitted by another player. Please refresh to see the current status.',
  CONCURRENT_TOURNAMENT_UPDATE: 'This tournament was just updated by another organizer. Please refresh and try again.',
  
  // State transitions
  INVALID_TOURNAMENT_STATUS: (current: string, action: string) => 
    `Cannot ${action} tournament with status ${current}. Please check the tournament status and try again.`,
  INCOMPLETE_MATCHES: (count: number, round: number) => 
    `Cannot advance round. ${count} match(es) in round ${round} must be completed first.`,
  
  // Pairings
  DUPLICATE_PAIRING: (player1: string, player2: string) => 
    `These players are already paired in this round: ${player1} vs ${player2}`,
  INVALID_PLAYER: (playerId: string) => 
    `Player ${playerId} is not registered or has dropped from the tournament`,
  INSUFFICIENT_PLAYERS: (count: number, minimum: number) => 
    `Insufficient players for tournament. Need at least ${minimum}, found ${count}.`,
  
  // Rating calculations
  RATING_CALCULATION_ERROR: 'An error occurred while calculating ratings. The tournament will complete without rating updates.',
  MISSING_PLAYER_STATS: (playerId: string) => 
    `Cannot calculate ratings: player ${playerId} has no game statistics`,
  
  // General
  OPERATION_FAILED: (operation: string) => 
    `Failed to ${operation}. Please try again or contact support if the problem persists.`,
  TRANSACTION_ROLLBACK: 'The operation was cancelled due to an error. No changes were made.',
}
