/**
 * Optimized Tournament Service
 * 
 * Example integration of all performance optimizations for tournament operations.
 * This service demonstrates how to use caching, batch logging, and query optimization
 * together for maximum performance.
 */

import { PrismaClient } from '@prisma/client'
import { TournamentProcessor } from './tournament-processor'
import { RatingCalculator } from './rating-calculator'
import { cacheManager } from './cache-manager'
import { BatchAuditLogger } from './batch-audit-logger'
import { createQueryOptimizer } from './query-optimizer'

/**
 * Optimized tournament service with integrated performance features
 */
export class OptimizedTournamentService {
  private processor: TournamentProcessor
  private ratingCalculator: RatingCalculator
  private batchLogger: BatchAuditLogger
  private queryOptimizer: ReturnType<typeof createQueryOptimizer>

  constructor(private prisma: PrismaClient) {
    this.processor = new TournamentProcessor(prisma)
    this.ratingCalculator = new RatingCalculator(prisma)
    this.batchLogger = new BatchAuditLogger(prisma, {
      maxBatchSize: 10,
      maxWaitTime: 5000,
      autoFlush: true
    })
    this.queryOptimizer = createQueryOptimizer(prisma)
  }

  /**
   * Get tournament state with caching
   * 
   * @param tournamentId - ID of the tournament
   * @returns Tournament state (cached or fresh)
   */
  async getTournamentState(tournamentId: string) {
    // Check cache first
    const cached = cacheManager.getTournamentState(tournamentId)
    
    if (cached) {
      return cached
    }

    // Fetch from database using optimized query
    const tournament = await this.queryOptimizer.getTournamentForPairing(tournamentId)
    
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    // Get completed match count for cache validation
    const completedMatches = await this.queryOptimizer.getCompletedMatches(tournamentId)

    // Cache the result (cast to proper types)
    const state = {
      tournament: tournament as any,
      entries: tournament.entries as any,
      matches: tournament.matches as any,
      completedMatchCount: completedMatches.length
    }

    cacheManager.cacheTournamentState(tournamentId, state)

    return state
  }

  /**
   * Get projected ratings with caching
   * 
   * @param tournamentId - ID of the tournament
   * @returns Projected ratings (cached or calculated)
   */
  async getProjectedRatings(tournamentId: string) {
    // RatingCalculator has built-in caching
    return this.ratingCalculator.calculateProjectedRatings(tournamentId)
  }

  /**
   * Start tournament with optimizations
   * 
   * @param tournamentId - ID of the tournament
   * @param organizerId - ID of the organizer
   * @returns Tournament start result
   */
  async startTournament(tournamentId: string, organizerId: string) {
    const result = await this.processor.startTournament(tournamentId, organizerId)
    
    // Invalidate cache after tournament state change
    cacheManager.invalidateTournament(tournamentId)
    
    return result
  }

  /**
   * Advance round with optimizations
   * 
   * @param tournamentId - ID of the tournament
   * @param organizerId - ID of the organizer
   * @returns Round advancement result
   */
  async advanceRound(tournamentId: string, organizerId: string) {
    const result = await this.processor.advanceRound(tournamentId, organizerId)
    
    // Invalidate cache after round advancement
    cacheManager.invalidateTournament(tournamentId)
    
    return result
  }

  /**
   * Complete tournament with optimizations
   * 
   * @param tournamentId - ID of the tournament
   * @param organizerId - ID of the organizer
   * @returns Tournament completion result
   */
  async completeTournament(tournamentId: string, organizerId: string) {
    // Flush any pending audit logs before completion
    await this.batchLogger.flush()
    
    const result = await this.processor.completeTournament(tournamentId, organizerId)
    
    // Invalidate all caches after completion
    cacheManager.invalidateTournament(tournamentId)
    this.ratingCalculator.invalidateCache(tournamentId)
    
    return result
  }

  /**
   * Get tournament standings with caching
   * 
   * @param tournamentId - ID of the tournament
   * @returns Tournament standings (cached or calculated)
   */
  async getStandings(tournamentId: string) {
    // Check cache first
    const cached = cacheManager.getStandings(tournamentId)
    
    if (cached) {
      return cached
    }

    // Fetch tournament state
    const state = await this.getTournamentState(tournamentId)
    
    // Calculate standings (simplified - actual implementation in TournamentProcessor)
    const standings = state.entries.map((entry: any) => ({
      playerId: entry.playerId,
      record: entry.record,
      placement: entry.placement || null
    }))

    // Cache the standings
    cacheManager.cacheStandings(tournamentId, standings)

    return standings
  }

  /**
   * Batch update match results
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
  ) {
    await this.queryOptimizer.batchUpdateMatches(updates)
    
    // Invalidate caches for affected tournaments
    const tournamentIds = new Set<string>()
    for (const update of updates) {
      const match = await this.prisma.match.findUnique({
        where: { id: update.id },
        select: { tournamentId: true }
      })
      if (match) {
        tournamentIds.add(match.tournamentId)
      }
    }

    for (const tournamentId of tournamentIds) {
      cacheManager.invalidateOnMatchUpdate(tournamentId)
      this.ratingCalculator.invalidateCache(tournamentId)
    }
  }

  /**
   * Shutdown service and flush pending operations
   */
  async shutdown() {
    await this.batchLogger.shutdown()
    cacheManager.clearAll()
  }

  /**
   * Get performance statistics
   * 
   * @returns Performance statistics for monitoring
   */
  getPerformanceStats() {
    return {
      cache: cacheManager.getStats(),
      batchLogger: this.batchLogger.getStats()
    }
  }
}

/**
 * Create optimized tournament service instance
 * 
 * @param prisma - Prisma client instance
 * @returns OptimizedTournamentService instance
 */
export function createOptimizedTournamentService(prisma: PrismaClient): OptimizedTournamentService {
  return new OptimizedTournamentService(prisma)
}
