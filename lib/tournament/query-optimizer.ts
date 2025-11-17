/**
 * Tournament Query Optimizer
 * 
 * Provides optimized database queries for tournament operations
 * with proper indexing hints and selective field loading.
 */

import { PrismaClient } from '@prisma/client'

/**
 * Optimized query builder for tournament data
 */
export class QueryOptimizer {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetch tournament with entries and matches (optimized)
   * 
   * Only loads necessary fields for pairing generation and standings calculation.
   * Uses selective field loading to reduce data transfer.
   * 
   * @param tournamentId - ID of the tournament
   * @returns Tournament with optimized data loading
   */
  async getTournamentForPairing(tournamentId: string) {
    return this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        tournamentStructure: true,
        totalRounds: true,
        gameId: true,
        tournamentLevel: true,
        entries: {
          where: { dropped: false },
          select: {
            id: true,
            playerId: true,
            seed: true,
            record: true,
            dropped: true
          },
          orderBy: { seed: 'asc' }
        },
        matches: {
          select: {
            id: true,
            player1Id: true,
            player2Id: true,
            winnerId: true,
            round: true,
            status: true,
            player1Score: true,
            player2Score: true
          },
          orderBy: [{ round: 'asc' }, { table: 'asc' }]
        }
      }
    })
  }

  /**
   * Fetch completed matches for a tournament (optimized)
   * 
   * Only loads completed matches with minimal fields for rating calculations.
   * 
   * @param tournamentId - ID of the tournament
   * @returns Array of completed matches
   */
  async getCompletedMatches(tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        status: 'COMPLETED'
      },
      select: {
        id: true,
        player1Id: true,
        player2Id: true,
        winnerId: true,
        player1Score: true,
        player2Score: true,
        round: true
      },
      orderBy: { round: 'asc' }
    })
  }

  /**
   * Fetch tournament entries with game stats (optimized)
   * 
   * Loads entries with their associated game statistics for rating calculations.
   * Uses a single query with proper joins to avoid N+1 queries.
   * 
   * @param tournamentId - ID of the tournament
   * @param gameId - ID of the game
   * @returns Array of entries with game stats
   */
  async getEntriesWithGameStats(tournamentId: string, gameId: string) {
    return this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      select: {
        id: true,
        playerId: true,
        placement: true,
        record: true,
        dropped: true,
        player: {
          select: {
            id: true,
            gameStats: {
              where: { gameId },
              select: {
                id: true,
                currentRating: true,
                seasonalStats: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Fetch current round matches (optimized)
   * 
   * Loads only matches for the current round with minimal fields.
   * 
   * @param tournamentId - ID of the tournament
   * @param round - Round number
   * @returns Array of matches for the specified round
   */
  async getCurrentRoundMatches(tournamentId: string, round: number) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        round
      },
      select: {
        id: true,
        player1Id: true,
        player2Id: true,
        winnerId: true,
        status: true,
        player1Score: true,
        player2Score: true,
        table: true
      },
      orderBy: { table: 'asc' }
    })
  }

  /**
   * Fetch pairing history for Swiss tournaments (optimized)
   * 
   * Loads all previous matches to build pairing history efficiently.
   * Returns minimal data needed for pairing avoidance.
   * 
   * @param tournamentId - ID of the tournament
   * @returns Array of matches with player IDs only
   */
  async getPairingHistory(tournamentId: string) {
    return this.prisma.match.findMany({
      where: { tournamentId },
      select: {
        player1Id: true,
        player2Id: true
      }
    })
  }

  /**
   * Batch fetch player game stats (optimized)
   * 
   * Fetches game stats for multiple players in a single query.
   * 
   * @param playerIds - Array of player IDs
   * @param gameId - ID of the game
   * @returns Map of player ID to game stats
   */
  async batchGetPlayerGameStats(playerIds: string[], gameId: string) {
    const stats = await this.prisma.playerGameStats.findMany({
      where: {
        playerId: { in: playerIds },
        gameId
      },
      select: {
        playerId: true,
        currentRating: true,
        seasonalStats: true
      }
    })

    // Convert to map for O(1) lookups
    const statsMap = new Map(stats.map(s => [s.playerId, s]))
    return statsMap
  }

  /**
   * Count incomplete matches for a round (optimized)
   * 
   * Uses count query instead of fetching all matches.
   * 
   * @param tournamentId - ID of the tournament
   * @param round - Round number
   * @returns Count of incomplete matches
   */
  async countIncompleteMatches(tournamentId: string, round: number): Promise<number> {
    return this.prisma.match.count({
      where: {
        tournamentId,
        round,
        status: { not: 'COMPLETED' }
      }
    })
  }

  /**
   * Check if tournament has any incomplete matches (optimized)
   * 
   * Uses exists-style query for fast validation.
   * 
   * @param tournamentId - ID of the tournament
   * @returns True if any incomplete matches exist
   */
  async hasIncompleteMatches(tournamentId: string): Promise<boolean> {
    const count = await this.prisma.match.count({
      where: {
        tournamentId,
        status: { not: 'COMPLETED' }
      },
      take: 1 // Only need to know if at least one exists
    })

    return count > 0
  }

  /**
   * Batch update match results (optimized)
   * 
   * Updates multiple matches in a single transaction.
   * 
   * @param updates - Array of match updates
   * @returns Promise that resolves when all updates are complete
   */
  async batchUpdateMatches(
    updates: Array<{
      id: string
      winnerId?: string | null
      player1Score?: number
      player2Score?: number
      status?: string
    }>
  ): Promise<void> {
    await this.prisma.$transaction(
      updates.map(update =>
        this.prisma.match.update({
          where: { id: update.id },
          data: {
            ...(update.winnerId !== undefined && { winnerId: update.winnerId }),
            ...(update.player1Score !== undefined && { player1Score: update.player1Score }),
            ...(update.player2Score !== undefined && { player2Score: update.player2Score }),
            ...(update.status && { status: update.status }),
            updatedAt: new Date()
          }
        })
      )
    )
  }
}

/**
 * Create query optimizer instance
 * 
 * @param prisma - Prisma client instance
 * @returns QueryOptimizer instance
 */
export function createQueryOptimizer(prisma: PrismaClient): QueryOptimizer {
  return new QueryOptimizer(prisma)
}
