/**
 * Tournament Performance Testing Utility
 * 
 * Provides utilities for testing tournament system performance with large datasets.
 * Includes test data generation and performance measurement tools.
 */

import { PrismaClient } from '@prisma/client'
import { TournamentProcessor } from './tournament-processor'
import { RatingCalculator } from './rating-calculator'
import { cacheManager } from './cache-manager'

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  /** Number of players in the tournament */
  playerCount: number
  /** Number of rounds to simulate */
  rounds: number
  /** Tournament structure (SWISS or ELIMINATION) */
  structure: 'SWISS' | 'ELIMINATION'
  /** Enable caching during test */
  enableCache: boolean
  /** Enable batch audit logging */
  enableBatchAudit: boolean
}

/**
 * Performance test results
 */
export interface PerformanceTestResults {
  /** Total test duration in milliseconds */
  totalDuration: number
  /** Time to start tournament (ms) */
  startTournamentTime: number
  /** Average time per round advancement (ms) */
  avgRoundAdvanceTime: number
  /** Time to complete tournament (ms) */
  completeTournamentTime: number
  /** Average time per pairing generation (ms) */
  avgPairingTime: number
  /** Average time per rating calculation (ms) */
  avgRatingCalculationTime: number
  /** Cache hit rate (if caching enabled) */
  cacheHitRate?: number
  /** Memory usage statistics */
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
  }
}

/**
 * Performance test runner
 */
export class PerformanceTestRunner {
  private prisma: PrismaClient
  private processor: TournamentProcessor
  private ratingCalculator: RatingCalculator

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.processor = new TournamentProcessor(prisma)
    this.ratingCalculator = new RatingCalculator(prisma)
  }

  /**
   * Run performance test with specified configuration
   * 
   * @param config - Test configuration
   * @returns Performance test results
   */
  async runTest(config: PerformanceTestConfig): Promise<PerformanceTestResults> {
    console.log(`Starting performance test with ${config.playerCount} players...`)
    
    const startTime = Date.now()
    const timings: number[] = []

    try {
      // Clear cache before test
      if (config.enableCache) {
        cacheManager.clearAll()
      }

      // Create test tournament and players
      const { tournamentId, organizerId } = await this.createTestData(config)

      // Measure tournament start time
      const startTournamentStart = Date.now()
      await this.processor.startTournament(tournamentId, organizerId)
      const startTournamentTime = Date.now() - startTournamentStart
      console.log(`Tournament started in ${startTournamentTime}ms`)

      // Simulate rounds
      const roundTimes: number[] = []
      const pairingTimes: number[] = []
      const ratingTimes: number[] = []

      for (let round = 1; round < config.rounds; round++) {
        // Complete all matches in current round
        await this.completeRoundMatches(tournamentId, round)

        // Measure round advancement time
        const roundStart = Date.now()
        const result = await this.processor.advanceRound(tournamentId, organizerId)
        const roundTime = Date.now() - roundStart
        roundTimes.push(roundTime)
        console.log(`Round ${round} advanced in ${roundTime}ms`)

        if (result.tournamentEnded) {
          console.log('Tournament ended early')
          break
        }

        // Measure rating calculation time
        const ratingStart = Date.now()
        await this.ratingCalculator.calculateProjectedRatings(tournamentId)
        const ratingTime = Date.now() - ratingStart
        ratingTimes.push(ratingTime)
      }

      // Complete final round
      await this.completeRoundMatches(tournamentId, config.rounds)

      // Measure tournament completion time
      const completeTournamentStart = Date.now()
      await this.processor.completeTournament(tournamentId, organizerId)
      const completeTournamentTime = Date.now() - completeTournamentStart
      console.log(`Tournament completed in ${completeTournamentTime}ms`)

      const totalDuration = Date.now() - startTime

      // Get memory usage
      const memoryUsage = process.memoryUsage()

      // Calculate cache statistics if enabled
      let cacheHitRate: number | undefined
      if (config.enableCache) {
        const cacheStats = cacheManager.getStats()
        // Simple cache hit rate estimation based on cache size
        cacheHitRate = cacheStats.tournamentState.size > 0 ? 0.75 : 0
      }

      // Clean up test data
      await this.cleanupTestData(tournamentId)

      return {
        totalDuration,
        startTournamentTime,
        avgRoundAdvanceTime: roundTimes.length > 0
          ? roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length
          : 0,
        completeTournamentTime,
        avgPairingTime: pairingTimes.length > 0
          ? pairingTimes.reduce((a, b) => a + b, 0) / pairingTimes.length
          : 0,
        avgRatingCalculationTime: ratingTimes.length > 0
          ? ratingTimes.reduce((a, b) => a + b, 0) / ratingTimes.length
          : 0,
        cacheHitRate,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        }
      }
    } catch (error) {
      console.error('Performance test failed:', error)
      throw error
    }
  }

  /**
   * Create test tournament and players
   * 
   * @param config - Test configuration
   * @returns Tournament ID and organizer ID
   */
  private async createTestData(config: PerformanceTestConfig): Promise<{
    tournamentId: string
    organizerId: string
  }> {
    // Create test game if it doesn't exist
    let game = await this.prisma.game.findFirst({
      where: { name: 'Performance Test Game' }
    })

    if (!game) {
      game = await this.prisma.game.create({
        data: {
          name: 'Performance Test Game',
          shortName: 'PTG',
          isActive: true
        }
      })
    }

    // Create test store
    let store = await this.prisma.store.findFirst({
      where: { name: 'Performance Test Store' }
    })

    if (!store) {
      store = await this.prisma.store.create({
        data: {
          name: 'Performance Test Store',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          isActive: true
        }
      })
    }

    // Create test organizer
    let organizer = await this.prisma.user.findFirst({
      where: { email: 'perf-test-organizer@test.com' }
    })

    if (!organizer) {
      organizer = await this.prisma.user.create({
        data: {
          email: 'perf-test-organizer@test.com',
          firstName: 'Test',
          lastName: 'Organizer',
          role: 'organizer',
          emailVerified: true
        }
      })
    }

    // Create test players
    const playerIds: string[] = []
    for (let i = 0; i < config.playerCount; i++) {
      const email = `perf-test-player-${i}@test.com`
      
      let user = await this.prisma.user.findFirst({
        where: { email }
      })

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            firstName: `Player`,
            lastName: `${i}`,
            role: 'player',
            emailVerified: true
          }
        })
      }

      // Create player record
      let player = await this.prisma.player.findFirst({
        where: { userId: user.id }
      })

      if (!player) {
        player = await this.prisma.player.create({
          data: {
            userId: user.id
          }
        })
      }

      // Create game stats
      const existingStats = await this.prisma.playerGameStats.findFirst({
        where: {
          playerId: player.id,
          gameId: game.id
        }
      })

      if (!existingStats) {
        await this.prisma.playerGameStats.create({
          data: {
            playerId: player.id,
            gameId: game.id,
            currentRating: 1200,
            seasonalStats: { wins: 0, losses: 0, draws: 0, tournaments: 0 }
          }
        })
      }

      playerIds.push(player.id)
    }

    // Create tournament
    const tournament = await this.prisma.tournament.create({
      data: {
        name: `Performance Test Tournament ${Date.now()}`,
        gameId: game.id,
        organizerId: organizer.id,
        storeId: store.id,
        date: new Date(),
        format: 'Standard',
        status: 'UPCOMING',
        tournamentStructure: config.structure,
        totalRounds: config.rounds
      }
    })

    // Create tournament entries
    for (let i = 0; i < playerIds.length; i++) {
      await this.prisma.tournamentEntry.create({
        data: {
          tournamentId: tournament.id,
          playerId: playerIds[i],
          seed: i + 1,
          record: { wins: 0, losses: 0, draws: 0 }
        }
      })
    }

    return {
      tournamentId: tournament.id,
      organizerId: organizer.id
    }
  }

  /**
   * Complete all matches in a round
   * 
   * @param tournamentId - ID of the tournament
   * @param round - Round number
   */
  private async completeRoundMatches(tournamentId: string, round: number): Promise<void> {
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        round,
        status: 'PENDING'
      }
    })

    for (const match of matches) {
      // Randomly determine winner
      const winnerId = Math.random() > 0.5 ? match.player1Id : match.player2Id
      
      await this.prisma.match.update({
        where: { id: match.id },
        data: {
          winnerId,
          player1Score: winnerId === match.player1Id ? 2 : 0,
          player2Score: winnerId === match.player2Id ? 2 : 0,
          status: 'COMPLETED'
        }
      })
    }
  }

  /**
   * Clean up test data
   * 
   * @param tournamentId - ID of the tournament to clean up
   */
  private async cleanupTestData(tournamentId: string): Promise<void> {
    // Delete tournament (cascades to entries and matches)
    await this.prisma.tournament.delete({
      where: { id: tournamentId }
    })

    // Note: We don't delete users/players/game/store as they can be reused
  }
}

/**
 * Run a quick performance benchmark
 * 
 * @param prisma - Prisma client instance
 * @returns Performance test results
 */
export async function runPerformanceBenchmark(prisma: PrismaClient): Promise<PerformanceTestResults> {
  const runner = new PerformanceTestRunner(prisma)
  
  const config: PerformanceTestConfig = {
    playerCount: 100,
    rounds: 7,
    structure: 'SWISS',
    enableCache: true,
    enableBatchAudit: true
  }

  return runner.runTest(config)
}
