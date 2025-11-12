/**
 * Rating Calculator
 * 
 * Calculates projected rating changes for players during active tournaments
 * and applies final rating changes upon tournament completion.
 * Integrates with the existing ELO rating system.
 */

import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { calculateMatchRatingChanges } from '@/lib/rating/elo'
import type { ProjectedRating, RatingChange, RatingConfidence } from './types'

/**
 * Cache for projected ratings to avoid recalculating on every request
 */
interface ProjectedRatingCache {
  /** Cached projected ratings */
  ratings: ProjectedRating[]
  /** Timestamp when the cache was created */
  timestamp: Date
  /** Number of completed matches when cache was created */
  completedMatchCount: number
}

/**
 * Rating Calculator class for tournament rating projections and updates
 */
export class RatingCalculator {
  private prisma: PrismaClient
  private cache: Map<string, ProjectedRatingCache> = new Map()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Calculate projected rating changes for all participants in an active tournament
   * 
   * @param tournamentId - ID of the tournament
   * @returns Array of projected ratings for all participants
   */
  async calculateProjectedRatings(tournamentId: string): Promise<ProjectedRating[]> {
    // Check cache first
    const cached = this.getCachedRatings(tournamentId)
    if (cached) {
      return cached
    }

    // Fetch tournament with all necessary data
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            player: {
              include: {
                gameStats: {
                  where: {
                    gameId: { equals: '' } // Will be replaced with actual gameId
                  }
                }
              }
            }
          }
        },
        matches: {
          where: {
            status: 'COMPLETED'
          },
          include: {
            player1: {
              include: {
                gameStats: true
              }
            },
            player2: {
              include: {
                gameStats: true
              }
            }
          }
        }
      }
    })

    if (!tournament) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tournament not found'
      })
    }

    // Get completed matches count for cache validation
    const completedMatchCount = tournament.matches.length

    // Fetch all entries with their current game stats
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        player: {
          include: {
            gameStats: {
              where: {
                gameId: tournament.gameId
              }
            }
          }
        }
      }
    })

    // Fetch all completed matches for the tournament
    const completedMatches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        status: 'COMPLETED'
      },
      include: {
        player1: {
          include: {
            gameStats: {
              where: {
                gameId: tournament.gameId
              }
            }
          }
        },
        player2: {
          include: {
            gameStats: {
              where: {
                gameId: tournament.gameId
              }
            }
          }
        }
      }
    })

    // Calculate projected ratings for each player
    const projectedRatings: ProjectedRating[] = []

    for (const entry of entries) {
      const playerId = entry.playerId
      const gameStats = entry.player.gameStats[0]

      if (!gameStats) {
        // Player has no stats for this game yet, skip
        continue
      }

      const currentRating = gameStats.currentRating

      // Find all matches involving this player
      const playerMatches = completedMatches.filter(
        match => match.player1Id === playerId || match.player2Id === playerId
      )

      // Calculate cumulative rating change from all matches
      let projectedRating = currentRating
      let totalRatingChange = 0

      for (const match of playerMatches) {
        const isPlayer1 = match.player1Id === playerId
        const opponentStats = isPlayer1 
          ? match.player2.gameStats[0]
          : match.player1.gameStats[0]

        if (!opponentStats) {
          continue
        }

        const opponentRating = opponentStats.currentRating

        // Get games played for K-factor calculation
        const seasonalStats = gameStats.seasonalStats as any
        const gamesPlayed = seasonalStats?.totalGames || 0

        const opponentSeasonalStats = opponentStats.seasonalStats as any
        const opponentGamesPlayed = opponentSeasonalStats?.totalGames || 0

        // Calculate rating change for this match
        const tournamentLevel = (tournament.tournamentLevel || 'LOCAL') as 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL'

        const ratingChanges = calculateMatchRatingChanges(
          isPlayer1 ? currentRating : opponentRating,
          isPlayer1 ? opponentRating : currentRating,
          match.winnerId,
          isPlayer1 ? playerId : match.player2Id,
          isPlayer1 ? match.player2Id : playerId,
          isPlayer1 ? gamesPlayed : opponentGamesPlayed,
          isPlayer1 ? opponentGamesPlayed : gamesPlayed,
          tournamentLevel
        )

        // Add the rating change to the projection
        const ratingChange = isPlayer1 
          ? ratingChanges.player1RatingChange 
          : ratingChanges.player2RatingChange

        totalRatingChange += ratingChange
        projectedRating += ratingChange
      }

      // Determine confidence level based on matches played
      const matchesConsidered = playerMatches.length
      const confidence = this.calculateConfidence(matchesConsidered)

      projectedRatings.push({
        playerId,
        gameId: tournament.gameId,
        currentRating,
        projectedRating,
        ratingChange: totalRatingChange,
        matchesConsidered,
        confidence
      })
    }

    // Cache the results
    this.cacheRatings(tournamentId, projectedRatings, completedMatchCount)

    return projectedRatings
  }

  /**
   * Apply rating changes to all players upon tournament completion
   * 
   * @param tournamentId - ID of the completed tournament
   * @returns Array of rating changes applied
   */
  async applyRatingChanges(tournamentId: string): Promise<RatingChange[]> {
    // Get projected ratings (which calculates all the changes)
    const projectedRatings = await this.calculateProjectedRatings(tournamentId)

    const ratingChanges: RatingChange[] = []

    // Apply each rating change in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const projection of projectedRatings) {
        // Update the player's game stats with the new rating
        await tx.playerGameStats.updateMany({
          where: {
            playerId: projection.playerId,
            gameId: projection.gameId
          },
          data: {
            currentRating: projection.projectedRating
          }
        })

        ratingChanges.push({
          playerId: projection.playerId,
          gameId: projection.gameId,
          oldRating: projection.currentRating,
          newRating: projection.projectedRating,
          ratingChange: projection.ratingChange
        })
      }
    })

    // Invalidate cache after applying changes
    this.invalidateCache(tournamentId)

    return ratingChanges
  }

  /**
   * Calculate the rating impact of a single match
   * 
   * @param player1Id - ID of player 1
   * @param player2Id - ID of player 2
   * @param winnerId - ID of the winner (null for draw)
   * @param gameId - ID of the game
   * @param tournamentLevel - Level of the tournament
   * @returns Rating changes for both players
   */
  async calculateMatchRatingImpact(
    player1Id: string,
    player2Id: string,
    winnerId: string | null,
    gameId: string,
    tournamentLevel: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL' = 'LOCAL'
  ): Promise<{
    player1Change: number
    player2Change: number
  }> {
    // Fetch player ratings
    const [player1Stats, player2Stats] = await Promise.all([
      this.prisma.playerGameStats.findFirst({
        where: {
          playerId: player1Id,
          gameId
        }
      }),
      this.prisma.playerGameStats.findFirst({
        where: {
          playerId: player2Id,
          gameId
        }
      })
    ])

    if (!player1Stats || !player2Stats) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Player game stats not found'
      })
    }

    // Get games played for K-factor calculation
    const player1SeasonalStats = player1Stats.seasonalStats as any
    const player1GamesPlayed = player1SeasonalStats?.totalGames || 0

    const player2SeasonalStats = player2Stats.seasonalStats as any
    const player2GamesPlayed = player2SeasonalStats?.totalGames || 0

    // Calculate rating changes
    const ratingChanges = calculateMatchRatingChanges(
      player1Stats.currentRating,
      player2Stats.currentRating,
      winnerId,
      player1Id,
      player2Id,
      player1GamesPlayed,
      player2GamesPlayed,
      tournamentLevel
    )

    return {
      player1Change: ratingChanges.player1RatingChange,
      player2Change: ratingChanges.player2RatingChange
    }
  }

  /**
   * Determine confidence level based on number of matches played
   * 
   * @param matchesPlayed - Number of matches played in the tournament
   * @returns Confidence level
   */
  private calculateConfidence(matchesPlayed: number): RatingConfidence {
    if (matchesPlayed === 0) {
      return 'LOW'
    } else if (matchesPlayed <= 2) {
      return 'LOW'
    } else if (matchesPlayed <= 4) {
      return 'MEDIUM'
    } else {
      return 'HIGH'
    }
  }

  /**
   * Get cached projected ratings if valid
   * 
   * @param tournamentId - ID of the tournament
   * @returns Cached ratings or null if cache is invalid
   */
  private getCachedRatings(tournamentId: string): ProjectedRating[] | null {
    const cached = this.cache.get(tournamentId)
    
    if (!cached) {
      return null
    }

    // Check if cache is still valid (within TTL)
    const now = new Date()
    const cacheAge = now.getTime() - cached.timestamp.getTime()
    
    if (cacheAge > this.CACHE_TTL_MS) {
      // Cache expired
      this.cache.delete(tournamentId)
      return null
    }

    return cached.ratings
  }

  /**
   * Cache projected ratings for a tournament
   * 
   * @param tournamentId - ID of the tournament
   * @param ratings - Projected ratings to cache
   * @param completedMatchCount - Number of completed matches
   */
  private cacheRatings(
    tournamentId: string,
    ratings: ProjectedRating[],
    completedMatchCount: number
  ): void {
    this.cache.set(tournamentId, {
      ratings,
      timestamp: new Date(),
      completedMatchCount
    })
  }

  /**
   * Invalidate cache for a tournament
   * 
   * @param tournamentId - ID of the tournament
   */
  invalidateCache(tournamentId: string): void {
    this.cache.delete(tournamentId)
  }

  /**
   * Clear all cached ratings
   */
  clearAllCache(): void {
    this.cache.clear()
  }
}
